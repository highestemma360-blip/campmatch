import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, PushSubscription
from .. import push
from .profiles import get_current_user

router = APIRouter()


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushEndpoint(BaseModel):
    endpoint: str
    keys: PushKeys


class SubscribeIn(BaseModel):
    subscription: PushEndpoint
    user_agent: str = ""


class UnsubscribeIn(BaseModel):
    endpoint: str


@router.get("/push/config")
def push_config(db: Session = Depends(get_db)):
    return {
        "enabled": push.push_available(),
        "public_key": push.public_vapid_key(db),
    }


@router.post("/push/subscribe")
def subscribe(
    data: SubscribeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None,
):
    endpoint = (data.subscription.endpoint or "").strip()[:500]
    if not endpoint or not data.subscription.keys.p256dh or not data.subscription.keys.auth:
        raise HTTPException(400, "Invalid push subscription.")

    existing = db.query(PushSubscription).filter(PushSubscription.endpoint == endpoint).first()
    ua = (data.user_agent or (request.headers.get("user-agent", "") if request else ""))[:255]
    if existing:
        existing.user_id = user.id
        existing.p256dh = data.subscription.keys.p256dh
        existing.auth = data.subscription.keys.auth
        existing.user_agent = ua
        existing.is_active = True
    else:
        db.add(
            PushSubscription(
                user_id=user.id,
                endpoint=endpoint,
                p256dh=data.subscription.keys.p256dh,
                auth=data.subscription.keys.auth,
                user_agent=ua,
            )
        )
    db.commit()
    return {"ok": True}


@router.post("/push/unsubscribe")
def unsubscribe(data: UnsubscribeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == (data.endpoint or "").strip()[:500])
        .first()
    )
    if sub:
        if sub.user_id != user.id and not user.is_admin:
            raise HTTPException(403, "Not allowed.")
        sub.is_active = False
        db.commit()
    return {"ok": True}


@router.post("/push/test")
def push_test(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not push.push_available():
        raise HTTPException(400, "Push notifications are not configured on this server.")
    push.push_to_user(
        db,
        user.id,
        {
            "title": "Campmatch alerts are on",
            "body": "You will now get match and campus notifications on your phone.",
            "url": "/",
            "icon": "/favicon.svg",
            "tag": "push-test",
        },
    )
    return {"ok": True}
