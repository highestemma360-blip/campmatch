import os
import json
import time
import threading
import asyncio
from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session

from . import models, database
from .database import SessionLocal, UPLOAD_DIR, get_db
from .models import User, Match, Setting
from .security import (
    bootstrap_defaults,
    decode_token,
    get_int_setting,
    validate_secrets,
)
from .realtime import hub
from .routers import auth, profiles, swipes, chat, admin, payments, notifications, ai
from .routers import push as push_router
from .routers import ai_features
from .routers import stories as stories_router
from .explore_rooms import seed_default_rooms
from .security import (
    bootstrap_defaults,
    decode_token,
    get_int_setting,
    set_setting,
    get_bool_setting,
)

# --- New production infrastructure ---
from .cron import start as cron_start, stop as cron_stop
from .webhooks import register_webhook, list_webhooks, unregister_webhook
from .feature_flags import is_enabled, set_flag, DEFAULT_FLAGS
from .circuit_breaker import get_breaker, get_all_breaker_states
from .idempotency import get_idempotency, set_idempotency, prune_idempotency
from .dlq import dlq
from .distributed_lock import distributed_lock
from .cache import cache, invalidate_cache, CACHE_ALLOWED_DOMAINS
from .backpressure import backpressure
from .saga import saga
from .pubsub import bus
from .backoff import retry_with_backoff, async_retry_with_backoff
from . import webhooks as webhooks_module

# Validate secrets at startup
_missing = validate_secrets()
if _missing:
    print(f"[campmatch] WARNING: missing secrets: {', '.join(_missing)}")

models.Base.metadata.create_all(bind=database.engine)
database.run_migrations()

with SessionLocal() as _startup_db:
    bootstrap_defaults(_startup_db)
    seed_default_rooms(_startup_db)
    # Initialize feature flags
    for flag, default in DEFAULT_FLAGS.items():
        existing = _startup_db.query(Setting).filter(Setting.key == f"flag_{flag}").first()
        if not existing:
            set_setting(_startup_db, f"flag_{flag}", "true" if default else "false")

    # Create test student account for demo/testing
    test_email = "student@st.umat.edu.gh"
    existing_test = _startup_db.query(User).filter(User.email == test_email).first()
    if not existing_test:
        test_user = User(
            email=test_email,
            original_email=test_email,
            password_hash=hash_password("Test1234!"),
            name="Test Student",
            school="UMaT",
            is_active=True,
            is_verified=True,
            token_version=1,
        )
        _startup_db.add(test_user)
        _startup_db.commit()
        print(f"[campmatch] Test account created: {test_email} / Test1234!")

# Start the AI admin worker (24/7 report/appeal reviewer, temporary bans only).
from .ai_admin import ai_admin_worker
ai_admin_worker.start()

# Start the cron scheduler (daily backups, retention, lockout cleanup, webhook retry).
cron_start()

# Keep a rolling copy of the database on the durable disk so a bad deploy can
# never wipe the only copy of student records.
_STARTUP_BACKUP = database.backup_sqlite("startup")
print(
    f"[campmatch] data_dir={database.DATA_DIR} sqlite={database.sqlite_file_path()} "
    f"uploads={UPLOAD_DIR} startup_backup={_STARTUP_BACKUP.get('file') or _STARTUP_BACKUP.get('reason')}"
)

# Register default circuit breakers for external services
get_breaker("google_oauth", failure_threshold=5, recovery_timeout_seconds=30)
get_breaker("payment_gateway", failure_threshold=5, recovery_timeout_seconds=60)
get_breaker("ai_moderation", failure_threshold=5, recovery_timeout_seconds=30)


def purge_expired_messages() -> int:
    """Auto-delete chat message text older than the retention window.

    Message *rows* are retained (soft-deleted) so match transcripts and safety
    records remain intact, but the readable text is cleared for privacy.
    """
    from .models import Message

    try:
        with SessionLocal() as s:
            days = get_int_setting(s, "message_retention_days", 30)
            cutoff = datetime.utcnow() - timedelta(days=max(1, days))
            rows = (
                s.query(Message)
                .filter(Message.created_at < cutoff, Message.is_deleted == False)  # noqa: E712
                .all()
            )
            for m in rows:
                m.content = ""
                m.is_deleted = True
            s.commit()
            return len(rows)
    except Exception as exc:  # pragma: no cover
        print(f"[campmatch] message purge failed: {exc}")
        return 0


def _retention_loop():
    import time as _time

    while True:
        _time.sleep(3600)  # hourly sweep
        try:
            purge_expired_messages()
        except Exception:
            pass


purge_expired_messages()
threading.Thread(target=_retention_loop, daemon=True).start()

app = FastAPI(title="Campmatch", docs_url=None, redoc_url=None)

rate_store = defaultdict(list)
auth_rate_store = defaultdict(list)
RATE_LIMIT_GENERAL = 240
RATE_LIMIT_AUTH = 15
_last_prune = time.time()


def _extract_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        # First hop in X-Forwarded-For is the originating client on Render/Cloudflare
        return xff.split(",")[0].strip()[:64]
    xri = request.headers.get("x-real-ip", "")
    if xri:
        return xri.strip()[:64]
    return (request.client.host if request.client else None) or "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        global _last_prune
        path = request.url.path
        if path.startswith("/uploads/") or path.startswith("/assets/") or path in ("/favicon.svg", "/logo.svg", "/manifest.webmanifest"):
            return await call_next(request)

        now = time.time()
        if now - _last_prune > 60:
            _last_prune = now
            for store in (rate_store, auth_rate_store):
                empty_keys = [k for k, ts in store.items() if not ts or now - ts[-1] >= 60]
                for k in empty_keys:
                    store.pop(k, None)

        ip = _extract_client_ip(request)

        if path in ("/api/login", "/api/signup", "/api/google", "/api/admin-auth/login") and request.method == "POST":
            auth_rate_store[ip] = [t for t in auth_rate_store[ip] if now - t < 60]
            if len(auth_rate_store[ip]) >= RATE_LIMIT_AUTH:
                return JSONResponse(
                    {"detail": "Too many sign-in attempts. Please wait one minute and try again."},
                    status_code=429,
                )
            auth_rate_store[ip].append(now)

        rate_store[ip] = [t for t in rate_store[ip] if now - t < 60]
        if len(rate_store[ip]) >= RATE_LIMIT_GENERAL:
            return JSONResponse({"detail": "Too many requests. Please wait a moment."}, status_code=429)
        rate_store[ip].append(now)
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(self), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' https://accounts.google.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: blob: https:; "
            "frame-src https://accounts.google.com; "
            "connect-src 'self' ws: wss: https://accounts.google.com;"
        )
        if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        if request.url.path.startswith("/uploads/"):
            response.headers["Cache-Control"] = "public, max-age=604800, immutable"
        return response


app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# class TimeoutMiddleware(BaseHTTPMiddleware):
#     """Enforce per-route request timeouts to prevent slow clients from
#     holding connections and exhausting the server."""

#     def __init__(self, app, default_timeout: float = 30.0):
#         super().__init__(app)
#         self.default_timeout = default_timeout
#         self.route_timeouts = {
#             "/api/login": 10.0,
#             "/api/signup": 10.0,
#             "/api/google": 15.0,
#             "/api/boost": 5.0,
#             "/api/swipe": 8.0,
#             "/api/payments": 20.0,
#         }

#     async def dispatch(self, request: Request, call_next):
#         path = request.url.path
#         timeout = self.route_timeouts.get(path, self.default_timeout)

#         try:
#             return await asyncio.wait_for(call_next(request), timeout=timeout)
#         except asyncio.TimeoutError:
#             return JSONResponse(
#                 {"detail": "Request timeout. Please try again."},
#                 status_code=504,
#             )


# app.add_middleware(TimeoutMiddleware)

default_origins = ["https://campmatch.onrender.com", "http://localhost:5173", "http://localhost:8000"]
extra_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(default_origins + extra_origins)),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(profiles.router, prefix="/api")
app.include_router(swipes.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(admin.router, prefix="/api/admin")
app.include_router(payments.router, prefix="/api/payments")
app.include_router(notifications.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(ai_features.router, prefix="/api")
app.include_router(push_router.router, prefix="/api")
app.include_router(stories_router.router, prefix="/api")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "online": hub.online_count(),
        "breakers": get_all_breaker_states(),
        "dlq_count": dlq.count(),
        "cache_size": len(cache._data),
    }


# --- Infrastructure / Admin-Only Endpoints ---


def _require_admin(request: Request, db: Session = Depends(get_db)):
    """Simple admin check: token must belong to an admin user."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Missing admin token")
    token = auth[7:]
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
        ver = payload.get("ver", 1)
    except Exception:
        raise HTTPException(401, "Invalid admin token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.is_deleted or not user.is_admin or (user.token_version or 1) != ver:
        raise HTTPException(403, "Admin access required")
    return user


@app.get("/api/admin/infra/feature-flags")
def infra_feature_flags(request: Request, user: User = Depends(_require_admin)):
    flags = {}
    with SessionLocal() as db:
        for flag in DEFAULT_FLAGS:
            flags[flag] = is_enabled(flag, db)
    return flags


@app.post("/api/admin/infra/feature-flags/{flag_name}")
async def infra_toggle_feature_flag(
    flag_name: str,
    request: Request,
    user: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    body = await request.json()
    enabled = bool(body.get("enabled", True))
    set_flag(flag_name, enabled, db)
    invalidate_cache(CACHE_FEATURE_FLAGS)
    bus.publish("feature_flag_changed", {"flag": flag_name, "enabled": enabled})
    return {"ok": True, "flag": flag_name, "enabled": enabled}


@app.get("/api/admin/infra/circuit-breakers")
def infra_circuit_breakers(user: User = Depends(_require_admin)):
    return get_all_breaker_states()


@app.get("/api/admin/infra/webhooks")
def infra_webhooks(user: User = Depends(_require_admin)):
    return list_webhooks()


@app.post("/api/admin/infra/webhooks")
async def infra_register_webhook(
    request: Request,
    user: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    body = await request.json()
    url = body.get("url")
    secret = body.get("secret", "")
    events = body.get("events", ["*"])
    if not url:
        raise HTTPException(400, "URL required")
    register_webhook(url, secret, events)
    return {"ok": True, "url": url}


@app.delete("/api/admin/infra/webhooks/{url:path}")
def infra_unregister_webhook(url: str, user: User = Depends(_require_admin)):
    unregister_webhook(url)
    return {"ok": True}


@app.get("/api/admin/infra/dlq")
def infra_dlq(source: str | None = None, user: User = Depends(_require_admin)):
    return {"items": dlq.list(source=source, unplayed_only=True), "count": dlq.count()}


@app.get("/api/admin/infra/backpressure")
def infra_backpressure(user: User = Depends(_require_admin)):
    # Return queue sizes for active users (sample)
    return {"controller": "backpressure", "max_queue_size": backpressure._max_queue_size}


@app.post("/api/admin/infra/cache/invalidate")
async def infra_cache_invalidate(
    request: Request,
    user: User = Depends(_require_admin),
):
    body = await request.json()
    prefix = body.get("prefix", "")
    count = invalidate_cache(prefix) if prefix else 0
    return {"ok": True, "invalidated": count}


@app.post("/api/admin/infra/idempotency/prune")
def infra_idempotency_prune(user: User = Depends(_require_admin)):
    prune_idempotency()
    return {"ok": True}


@app.get("/api/admin/infra/saga/{exec_id}")
def infra_saga_status(exec_id: str, user: User = Depends(_require_admin)):
    exec_obj = saga.get_status(exec_id)
    if not exec_obj:
        raise HTTPException(404, "Saga execution not found")
    return {
        "id": exec_obj.id,
        "status": exec_obj.status,
        "started_at": exec_obj.started_at,
        "completed_at": exec_obj.completed_at,
        "error": exec_obj.error,
        "results": exec_obj.results,
    }


@app.on_event("shutdown")
def _shutdown():
    cron_stop()
    prune_idempotency()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query("")):
    if not token:
        await ws.close(code=4401)
        return
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
        ver = payload.get("ver", 1)
    except Exception:
        await ws.close(code=4401)
        return

    with SessionLocal() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or user.is_deleted or not user.is_active or (user.token_version or 1) != ver:
            await ws.close(code=4401)
            return

    await hub.connect(user_id, ws)
    try:
        while True:
            raw = await ws.receive_text()
            if len(raw) > 4096:
                continue
            try:
                msg = json.loads(raw)
            except Exception:
                continue

            msg_type = msg.get("type")
            if msg_type == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
            elif msg_type == "typing":
                match_id = int(msg.get("match_id") or 0)
                if match_id:
                    with SessionLocal() as db:
                        m = db.query(Match).filter(Match.id == match_id, Match.is_active == True).first()
                        if m and user_id in (m.user1_id, m.user2_id):
                            partner_id = m.user2_id if m.user1_id == user_id else m.user1_id
                            await hub.send_to_user(
                                partner_id,
                                {
                                    "type": "typing",
                                    "match_id": match_id,
                                    "sender_id": user_id,
                                    "is_typing": bool(msg.get("is_typing", True)),
                                },
                            )
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        hub.disconnect(user_id, ws)


frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        candidate = os.path.abspath(os.path.join(frontend_dist, full_path))
        if full_path and candidate.startswith(frontend_dist) and os.path.isfile(candidate):
            # The service worker and app shell must revalidate so install and
            # update prompts always see the current deployment.
            headers = {}
            if full_path.endswith("sw.js") or full_path.endswith("index.html"):
                headers["Cache-Control"] = "no-cache"
            if full_path.endswith(".webmanifest"):
                return FileResponse(
                    candidate,
                    media_type="application/manifest+json",
                    headers=headers,
                )
            return FileResponse(candidate, headers=headers)
        index = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index):
            return FileResponse(index)
        return JSONResponse({"detail": "Not found"}, status_code=404)


@app.exception_handler(500)
async def custom_500(request: Request, exc):
    import traceback
    tb = traceback.format_exc()
    print(f"[500 ERROR] {tb}")
    return JSONResponse({"detail": "Internal server error", "traceback": tb[-2000:]}, status_code=500)


@app.exception_handler(404)
async def custom_404(request: Request, exc):
    return JSONResponse({"detail": "Not found"}, status_code=404)
