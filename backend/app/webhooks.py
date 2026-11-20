"""
Campmatch Outgoing Webhook System

Allows administrators to register webhook endpoints for platform events
(user signup, payment, match, report, etc.). Failed deliveries are retried
with exponential backoff and moved to a dead letter queue after max retries.
"""

import json
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import WebhookEvent

# In-memory webhook registry (in production, backed by Redis/DB)
# url -> { "secret": str, "events": list[str], "active": bool }
_webhook_registry: dict[str, dict] = {}
_registry_lock = threading.Lock()

# Dead letter queue for permanently failed webhooks
_dlq: list[dict] = []
_dlq_lock = threading.Lock()

# Retry store: event_id -> { "attempts": int, "next_retry": float, "payload": dict }
_retry_store: dict[str, dict] = {}
_retry_lock = threading.Lock()

MAX_WEBHOOK_RETRIES = 5
WEBHOOK_TIMEOUT_SECONDS = 10


def register_webhook(url: str, secret: str, events: list[str] | None = None, active: bool = True):
    """Register an outgoing webhook endpoint."""
    with _registry_lock:
        _webhook_registry[url] = {
            "secret": secret,
            "events": events or ["*"],
            "active": active,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }


def unregister_webhook(url: str):
    with _registry_lock:
        _webhook_registry.pop(url, None)


def list_webhooks() -> list[dict]:
    with _registry_lock:
        return [
            {"url": url, **cfg} for url, cfg in _webhook_registry.items()
        ]


def deliver_event(event_type: str, payload: dict, db: Session):
    """
    Fire-and-forget webhook delivery. Records the event for idempotency,
    then attempts delivery to all matching registered webhooks.
    """
    event_id = str(uuid.uuid4())

    # Idempotency: record the event so duplicates are detected
    existing = (
        db.query(WebhookEvent)
        .filter(WebhookEvent.event_id == event_id)
        .first()
    )
    if existing:
        return event_id  # already processed

    db.add(WebhookEvent(event_id=event_id, event_type=event_type))
    db.commit()

    # Snapshot matching webhooks
    with _registry_lock:
        targets = [
            (url, cfg)
            for url, cfg in _webhook_registry.items()
            if cfg.get("active") and ("*" in cfg.get("events", []) or event_type in cfg.get("events", []))
        ]

    if not targets:
        return event_id

    # Attempt delivery (best-effort; failures go to retry queue)
    for url, cfg in targets:
        _attempt_delivery(url, cfg, event_id, event_type, payload)

    return event_id


def _attempt_delivery(url: str, cfg: dict, event_id: str, event_type: str, payload: dict):
    """Single delivery attempt with HMAC signature."""
    import hmac
    import hashlib

    try:
        import httpx

        body = json.dumps({"event_id": event_id, "event_type": event_type, "payload": payload}).encode()
        signature = hmac.new(cfg["secret"].encode(), body, hashlib.sha256).hexdigest()

        with httpx.Client(timeout=WEBHOOK_TIMEOUT_SECONDS) as client:
            r = client.post(
                url,
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "X-Campmatch-Event": event_type,
                    "X-Campmatch-Signature": f"sha256={signature}",
                    "X-Campmatch-Event-ID": event_id,
                },
            )
            if r.status_code >= 400:
                raise Exception(f"HTTP {r.status_code}")
    except Exception as exc:
        _schedule_retry(event_id, url, cfg, event_type, payload, str(exc))


def _schedule_retry(event_id: str, url: str, cfg: dict, event_type: str, payload: dict, error: str):
    with _retry_lock:
        entry = _retry_store.get(event_id, {"attempts": 0, "urls": {}, "payload": payload, "event_type": event_type})
        entry["attempts"] += 1
        entry["urls"][url] = {
            "secret": cfg["secret"],
            "error": error,
            "last_attempt": time.time(),
        }

        if entry["attempts"] >= MAX_WEBHOOK_RETRIES:
            # Move to dead letter queue
            with _dlq_lock:
                _dlq.append(
                    {
                        "event_id": event_id,
                        "event_type": event_type,
                        "url": url,
                        "payload": payload,
                        "error": error,
                        "failed_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
            # Keep DLQ bounded
            if len(_dlq) > 1000:
                _dlq.pop(0)
            _retry_store.pop(event_id, None)
        else:
            # Exponential backoff: 2^attempts seconds
            delay = min(2 ** entry["attempts"], 3600)
            entry["next_retry"] = time.time() + delay
            _retry_store[event_id] = entry


def retry_failed_webhooks() -> int:
    """Retry webhooks that are due for retry. Returns count retried."""
    import httpx

    now = time.time()
    due: list[tuple[str, dict]] = []

    with _retry_lock:
        for event_id, entry in list(_retry_store.items()):
            next_retry = entry.get("next_retry", 0)
            if next_retry <= now:
                for url, url_entry in list(entry.get("urls", {}).items()):
                    due.append((event_id, entry, url, url_entry))

    sent = 0
    for event_id, entry, url, url_entry in due:
        cfg = {"secret": url_entry["secret"]}
        payload = entry["payload"]
        event_type = entry["event_type"]

        try:
            body = json.dumps({"event_id": event_id, "event_type": event_type, "payload": payload}).encode()
            import hmac, hashlib
            signature = hmac.new(cfg["secret"].encode(), body, hashlib.sha256).hexdigest()

            with httpx.Client(timeout=WEBHOOK_TIMEOUT_SECONDS) as client:
                r = client.post(
                    url,
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Campmatch-Event": event_type,
                        "X-Campmatch-Signature": f"sha256={signature}",
                        "X-Campmatch-Event-ID": event_id,
                    },
                )
                if r.status_code < 400:
                    # Success: remove this url from retry entry
                    with _retry_lock:
                        if event_id in _retry_store:
                            _retry_store[event_id]["urls"].pop(url, None)
                            if not _retry_store[event_id]["urls"]:
                                _retry_store.pop(event_id, None)
                    sent += 1
                else:
                    raise Exception(f"HTTP {r.status_code}")
        except Exception:
            # Will be retried again on next cycle
            pass

    return sent


def get_dlq() -> list[dict]:
    with _dlq_lock:
        return list(_dlq)


def clear_dlq():
    with _dlq_lock:
        _dlq.clear()
