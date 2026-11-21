"""Web Push delivery (VAPID) for matches and campus notifications.

Push works through the browser's Push API + a service worker. Students opt in
from the app (Profile → Phone alerts). Subscriptions are stored in the
``push_subscriptions`` table and delivered with ``pywebpush`` using VAPID keys
that are auto-generated once and persisted in the settings table (so they
survive redeploys on the durable disk).
"""

import base64
import json
import logging
import os
import threading
from datetime import datetime, timezone

log = logging.getLogger("campmatch.push")

try:
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization

    _HAS_CRYPTO = True
except Exception:  # pragma: no cover - crypto comes with python-jose[cryptography]
    _HAS_CRYPTO = False

try:
    from pywebpush import webpush, WebPushException  # noqa: F401

    _HAS_WEBPUSH = True
except Exception:  # pragma: no cover - optional until configured
    _HAS_WEBPUSH = False


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def public_key_from_private_pem(priv_pem: str) -> str:
    priv = serialization.load_pem_private_key(priv_pem.encode(), password=None)
    pub = priv.public_key().public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )
    return _b64url(pub)


def vapid_subject() -> str:
    return os.environ.get("VAPID_SUBJECT", "mailto:admin@campmatch.app").strip()


def push_available() -> bool:
    return _HAS_WEBPUSH and _HAS_CRYPTO


def ensure_vapid_keys(db) -> tuple:
    """Return (public_key, private_key_pem), generating and persisting once."""
    from .security import get_setting, set_setting

    pub = os.environ.get("VAPID_PUBLIC_KEY", "").strip()
    priv = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
    if not pub or not priv:
        pub = get_setting(db, "vapid_public_key", "")
        priv = get_setting(db, "vapid_private_key", "")
    if not pub or not priv:
        if not _HAS_CRYPTO:
            return "", ""
        key = ec.generate_private_key(ec.SECP256R1())
        priv = key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ).decode()
        pub = public_key_from_private_pem(priv)
        set_setting(db, "vapid_public_key", pub)
        set_setting(db, "vapid_private_key", priv)
        db.commit()
    return pub, priv


def public_vapid_key(db) -> str:
    if not push_available():
        return ""
    pub, _priv = ensure_vapid_keys(db)
    return pub


def _deliver(sub_rows, payload, priv_pem):
    """Send to a list of (id, endpoint, p256dh, auth) tuples. Returns set of
    subscription ids to deactivate (expired) and set to touch."""
    if not _HAS_WEBPUSH:
        return set(), set()
    subject = vapid_subject()
    expired, touched = set(), set()
    for sub_id, endpoint, p256dh, auth in sub_rows:
        try:
            webpush(
                subscription_info={"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
                data=json.dumps(payload),
                vapid_private_key=priv_pem,
                vapid_claims={"sub": subject},
                ttl=3600,
            )
            touched.add(sub_id)
        except WebPushException as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status in (404, 410):
                expired.add(sub_id)
            else:
                touched.add(sub_id)
        except Exception:
            continue
    return expired, touched


def schedule_push(user_ids, payload, db) -> None:
    """Fire-and-forget delivery to every active subscription for user_ids."""
    if not push_available() or not user_ids:
        return
    from .models import PushSubscription

    priv_pem = ensure_vapid_keys(db)[1]
    if not priv_pem:
        return

    rows = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id.in_(user_ids), PushSubscription.is_active == True)  # noqa: E712
        .all()
    )
    if not rows:
        return
    sub_rows = [(s.id, s.endpoint, s.p256dh, s.auth) for s in rows]

    def _run():
        from .database import SessionLocal
        from .models import PushSubscription

        expired, touched = _deliver(sub_rows, payload, priv_pem)
        if not expired and not touched:
            return
        try:
            with SessionLocal() as s:
                now = datetime.now(timezone.utc)
                if expired:
                    s.query(PushSubscription).filter(PushSubscription.id.in_(expired)).update(
                        {"is_active": False}, synchronize_session=False
                    )
                if touched:
                    s.query(PushSubscription).filter(PushSubscription.id.in_(touched)).update(
                        {"last_used_at": now}, synchronize_session=False
                    )
                s.commit()
        except Exception:  # pragma: no cover
            log.exception("push cleanup failed")

    threading.Thread(target=_run, daemon=True).start()


def push_to_user(db, user_id: int, payload: dict) -> None:
    schedule_push([user_id], payload, db)


def push_to_users(db, user_ids, payload: dict) -> None:
    schedule_push(user_ids, payload, db)


def push_notification(db, notification) -> None:
    """Deliver a Notification to every student it is visible to."""
    from .models import User
    from .routers.notifications import _is_visible_to

    recipients = (
        db.query(User)
        .filter(
            User.is_deleted == False,  # noqa: E712
            User.is_active == True,  # noqa: E712
            User.is_admin == False,  # noqa: E712
        )
        .all()
    )
    ids = [u.id for u in recipients if _is_visible_to(notification, u)]
    payload = {
        "title": notification.title,
        "body": notification.body or "",
        "url": "/",
        "icon": "/favicon.svg",
        "image": notification.flyer_url or "",
        "tag": f"notification-{notification.id}",
    }
    push_to_users(db, ids, payload)
