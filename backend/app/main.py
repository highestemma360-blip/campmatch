import os
import json
import time
from collections import defaultdict
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from . import models, database
from .database import SessionLocal, UPLOAD_DIR
from .models import User, Match
from .security import bootstrap_defaults, decode_token
from .realtime import hub
from .routers import auth, profiles, swipes, chat, admin, payments, notifications
from .routers import push as push_router
from .explore_rooms import seed_default_rooms

models.Base.metadata.create_all(bind=database.engine)
database.run_migrations()

with SessionLocal() as _startup_db:
    bootstrap_defaults(_startup_db)
    seed_default_rooms(_startup_db)

# Keep a rolling copy of the database on the durable disk so a bad deploy can
# never wipe the only copy of student records.
_STARTUP_BACKUP = database.backup_sqlite("startup")
print(
    f"[campmatch] data_dir={database.DATA_DIR} sqlite={database.sqlite_file_path()} "
    f"uploads={UPLOAD_DIR} startup_backup={_STARTUP_BACKUP.get('file') or _STARTUP_BACKUP.get('reason')}"
)

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
app.include_router(push_router.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "online": hub.online_count()}


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
            return FileResponse(candidate)
        index = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index):
            return FileResponse(index)
        return JSONResponse({"detail": "Not found"}, status_code=404)


@app.exception_handler(404)
async def custom_404(request: Request, exc):
    return JSONResponse({"detail": "Not found"}, status_code=404)
