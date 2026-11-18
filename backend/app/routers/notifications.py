import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Notification, NotificationRead
from ..security import get_bool_setting
from .profiles import get_current_user

router = APIRouter()


def _is_visible_to(n: Notification, user: User) -> bool:
    now = datetime.utcnow()
    if not n.is_active:
        return False
    if n.expires_at and n.expires_at < now:
        return False
    if n.target_user_id and n.target_user_id != user.id:
        return False
    if n.target_school and (n.target_school or "").lower() not in (user.school or "").lower():
        return False

    audience = (n.audience or "all").lower()
    if audience == "plus" and not user.is_premium:
        return False
    if audience == "free" and user.is_premium:
        return False
    if audience == "new":
        created = user.created_at or now
        if (now - created) > timedelta(days=14):
            return False
    return True


def notifications_for_user(user: User, db: Session, limit: int = 40):
    rows = (
        db.query(Notification)
        .filter(Notification.is_active == True)  # noqa: E712
        .order_by(Notification.created_at.desc())
        .limit(150)
        .all()
    )
    visible = [n for n in rows if _is_visible_to(n, user)]
    read_ids = {
        r.notification_id
        for r in db.query(NotificationRead)
        .filter(NotificationRead.user_id == user.id)
        .all()
    }
    items = []
    for n in visible[:limit]:
        items.append(
            {
                "id": n.id,
                "title": n.title,
                "body": n.body or "",
                "flyer_url": n.flyer_url or "",
                "audience": n.audience or "all",
                "created_at": n.created_at.isoformat() if n.created_at else "",
                "expires_at": n.expires_at.isoformat() if n.expires_at else None,
                "read": n.id in read_ids,
            }
        )
    unread = sum(1 for i in items if not i["read"])
    return items, unread


@router.get("/notifications")
def list_my_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items, unread = notifications_for_user(user, db)
    return {"items": items, "unread": unread}


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n or not _is_visible_to(n, user):
        raise HTTPException(404, "Notification not found.")
    existing = (
        db.query(NotificationRead)
        .filter(NotificationRead.notification_id == notification_id, NotificationRead.user_id == user.id)
        .first()
    )
    if not existing:
        db.add(NotificationRead(notification_id=notification_id, user_id=user.id))
        db.commit()
    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items, _ = notifications_for_user(user, db)
    existing = {
        r.notification_id
        for r in db.query(NotificationRead).filter(NotificationRead.user_id == user.id).all()
    }
    for item in items:
        if item["id"] not in existing:
            db.add(NotificationRead(notification_id=item["id"], user_id=user.id))
    db.commit()
    return {"ok": True}
