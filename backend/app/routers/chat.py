from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models import User, Match, Message, Swipe, Report, Block
from ..realtime import hub
from .. import push
from ..security import get_bool_setting
from .profiles import get_current_user, serialize_user
from .swipes import get_blocked_user_ids

router = APIRouter()


class MsgIn(BaseModel):
    content: str


class ReactIn(BaseModel):
    reaction: str = "heart"


class ReportIn(BaseModel):
    reported_id: int
    reason: str
    details: str = ""
    block_user: bool = True


class BlockIn(BaseModel):
    blocked_id: int


@router.get("/matches")
def get_matches(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    blocked_ids = get_blocked_user_ids(user.id, db)
    matches = (
        db.query(Match)
        .filter(
            ((Match.user1_id == user.id) | (Match.user2_id == user.id)),
            Match.is_active == True,
        )
        .order_by(Match.created_at.desc())
        .all()
    )
    out = []
    now = datetime.now(timezone.utc)
    for m in matches:
        other_id = m.user2_id if m.user1_id == user.id else m.user1_id
        if other_id in blocked_ids:
            continue
        other = (
            db.query(User)
            .filter(User.id == other_id, User.is_deleted == False, User.is_active == True)
            .first()
        )
        if not other:
            continue

        last = (
            db.query(Message)
            .filter(Message.match_id == m.id, Message.is_deleted == False)
            .order_by(Message.created_at.desc())
            .first()
        )
        unread_count = (
            db.query(Message)
            .filter(
                Message.match_id == m.id,
                Message.sender_id != user.id,
                Message.read == False,
                Message.is_deleted == False,
            )
            .count()
        )

        expires_at = m.expires_at or (m.created_at + timedelta(hours=24))
        hours_left = None
        if not last:
            hours_left = max(0.0, round((expires_at - now).total_seconds() / 3600.0, 1))
            # Hide expired unmessaged matches unless extended
            if hours_left <= 0 and not m.extended:
                continue

        profile_card = serialize_user(other, full=False)
        profile_card["photo_url"] = profile_card["photo_urls"][0] if profile_card["photo_urls"] else None

        out.append({
            "match_id": m.id,
            "created_at": m.created_at.isoformat() if m.created_at else now.isoformat(),
            "expires_at": expires_at.isoformat() if not last else None,
            "hours_left": hours_left,
            "extended": bool(m.extended),
            "is_super": bool(m.is_super),
            "unread_count": unread_count,
            "user": profile_card,
            "last_message": last.content if last else None,
            "last_sender_id": last.sender_id if last else None,
            "last_at": last.created_at.isoformat() if last else (m.created_at.isoformat() if m.created_at else None),
        })

    out.sort(key=lambda item: item["last_at"] or "", reverse=True)
    return out


@router.get("/matches/{match_id}/messages")
async def get_messages(match_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Match).filter(Match.id == match_id, Match.is_active == True).first()
    if not m or user.id not in (m.user1_id, m.user2_id):
        raise HTTPException(403, "Access denied.")

    # Read receipts are a Campmatch Plus feature. While the admin has Plus turned
    # off, every premium feature is free, so receipts unlock for everyone.
    plus_enabled = get_bool_setting(db, "plus_enabled", False)
    sender_sees_receipts = (not plus_enabled) or bool(user.is_premium)

    updated_count = (
        db.query(Message)
        .filter(
            Message.match_id == match_id,
            Message.sender_id != user.id,
            Message.read == False,
        )
        .update({"read": True})
    )
    db.commit()

    if updated_count > 0:
        other_id = m.user2_id if m.user1_id == user.id else m.user1_id
        # Only notify the original sender when their receipt entitlement is active.
        other = db.query(User).filter(User.id == other_id).first()
        other_sees_receipts = (not plus_enabled) or bool(other and other.is_premium)
        if other_sees_receipts:
            await hub.send_to_user(other_id, {"type": "messages_read", "match_id": match_id})

    msgs = (
        db.query(Message)
        .filter(Message.match_id == match_id, Message.is_deleted == False)
        .order_by(Message.created_at)
        .all()
    )
    return [
        {
            "id": msg.id,
            "match_id": msg.match_id,
            "sender_id": msg.sender_id,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
            # Mask the read flag on my own sent messages when I don't have receipts.
            "read": bool(msg.read) if (sender_sees_receipts or msg.sender_id != user.id) else False,
            "reaction": msg.reaction or "",
        }
        for msg in msgs
    ]


@router.post("/matches/{match_id}/messages")
async def send_message(match_id: int, data: MsgIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Match).filter(Match.id == match_id, Match.is_active == True).first()
    if not m or user.id not in (m.user1_id, m.user2_id):
        raise HTTPException(403, "Conversation is no longer active.")

    other_id = m.user2_id if m.user1_id == user.id else m.user1_id
    if other_id in get_blocked_user_ids(user.id, db):
        raise HTTPException(403, "Conversation is blocked.")
    other = db.query(User).filter(User.id == other_id, User.is_deleted == False, User.is_active == True).first()
    if not other:
        raise HTTPException(404, "Recipient is no longer available.")

    content = data.content.strip()
    if not content:
        raise HTTPException(400, "Message cannot be empty.")

    msg = Message(match_id=match_id, sender_id=user.id, content=content[:1000])
    db.add(msg)
    db.commit()
    db.refresh(msg)

    payload_msg = {
        "id": msg.id,
        "match_id": match_id,
        "sender_id": msg.sender_id,
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
        "read": False,
        "reaction": "",
    }

    await hub.send_to_user(other_id, {"type": "new_message", "match_id": match_id, "message": payload_msg})
    await hub.send_to_user(user.id, {"type": "new_message", "match_id": match_id, "message": payload_msg})

    # Deliver a phone notification so the recipient sees the message even when the app is closed.
    if other_id != user.id and other:
        push.push_to_user(
            db,
            other_id,
            {
                "title": "New message",
                "body": f"{user.name or 'Someone'} sent you a message.",
                "url": "/",
                "icon": "/favicon.svg",
                "tag": f"message-{match.id}",
            },
        )

    return {"ok": True, "message": payload_msg}


@router.post("/messages/{msg_id}/react")
async def react_message(msg_id: int, data: ReactIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msg = db.query(Message).filter(Message.id == msg_id, Message.is_deleted == False).first()
    if not msg:
        raise HTTPException(404, "Message not found.")
    m = db.query(Match).filter(Match.id == msg.match_id, Match.is_active == True).first()
    if not m or user.id not in (m.user1_id, m.user2_id):
        raise HTTPException(403, "Access denied.")

    clean = (data.reaction or "heart").strip()[:12]
    msg.reaction = "" if msg.reaction == clean else clean
    db.commit()

    other_id = m.user2_id if m.user1_id == user.id else m.user1_id
    event = {"type": "message_reaction", "match_id": m.id, "message_id": msg.id, "reaction": msg.reaction}
    await hub.send_to_user(other_id, event)
    await hub.send_to_user(user.id, event)
    return {"ok": True, "reaction": msg.reaction}


@router.post("/matches/{match_id}/extend")
async def extend_match(match_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Match).filter(Match.id == match_id, Match.is_active == True).first()
    if not m or user.id not in (m.user1_id, m.user2_id):
        raise HTTPException(403, "Access denied.")
    if m.extended:
        return {"ok": True, "extended": True, "expires_at": m.expires_at.isoformat() if m.expires_at else None}
    base_time = max(datetime.now(timezone.utc), m.expires_at or datetime.now(timezone.utc))
    m.expires_at = base_time + timedelta(hours=24)
    m.extended = True
    db.commit()

    other_id = m.user2_id if m.user1_id == user.id else m.user1_id
    await hub.send_to_user(other_id, {"type": "match_extended", "match_id": match_id, "expires_at": m.expires_at.isoformat()})
    return {"ok": True, "extended": True, "expires_at": m.expires_at.isoformat()}


@router.delete("/matches/{match_id}")
async def unmatch(match_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Soft-unmatch: hides match from both users while retaining full Match and Message rows
    in the database for administrative safety records.
    """
    m = db.query(Match).filter(Match.id == match_id, Match.is_active == True).first()
    if not m or user.id not in (m.user1_id, m.user2_id):
        raise HTTPException(403, "Access denied.")
    m.is_active = False
    m.unmatched_by = user.id
    m.unmatched_at = datetime.now(timezone.utc)
    db.commit()

    other_id = m.user2_id if m.user1_id == user.id else m.user1_id
    await hub.send_to_user(other_id, {"type": "match_removed", "match_id": match_id})
    return {"ok": True}


@router.post("/block")
async def block_user(data: BlockIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.blocked_id == user.id:
        raise HTTPException(400, "Invalid target.")
    exists = db.query(Block).filter(Block.blocker_id == user.id, Block.blocked_id == data.blocked_id).first()
    if not exists:
        db.add(Block(blocker_id=user.id, blocked_id=data.blocked_id))

    u1, u2 = min(user.id, data.blocked_id), max(user.id, data.blocked_id)
    m = db.query(Match).filter(Match.user1_id == u1, Match.user2_id == u2, Match.is_active == True).first()
    if m:
        m.is_active = False
        m.unmatched_by = user.id
        m.unmatched_at = datetime.now(timezone.utc)
        await hub.send_to_user(data.blocked_id, {"type": "match_removed", "match_id": m.id})

    db.commit()
    return {"ok": True}


@router.post("/report")
async def report_user(data: ReportIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.reported_id == user.id:
        raise HTTPException(400, "Invalid report target.")

    rep = Report(
        reporter_id=user.id,
        reported_id=data.reported_id,
        reason=data.reason.strip()[:255],
        details=data.details.strip()[:1000],
        status="open",
        resolved=False,
    )
    db.add(rep)

    if data.block_user:
        exists = db.query(Block).filter(Block.blocker_id == user.id, Block.blocked_id == data.reported_id).first()
        if not exists:
            db.add(Block(blocker_id=user.id, blocked_id=data.reported_id))

    existing_swipe = db.query(Swipe).filter(Swipe.swiper_id == user.id, Swipe.swiped_id == data.reported_id).first()
    if not existing_swipe:
        db.add(Swipe(swiper_id=user.id, swiped_id=data.reported_id, liked=False))

    u1, u2 = min(user.id, data.reported_id), max(user.id, data.reported_id)
    m = db.query(Match).filter(Match.user1_id == u1, Match.user2_id == u2, Match.is_active == True).first()
    if m:
        m.is_active = False
        m.unmatched_by = user.id
        m.unmatched_at = datetime.now(timezone.utc)
        await hub.send_to_user(data.reported_id, {"type": "match_removed", "match_id": m.id})

    db.commit()
    return {"ok": True}
