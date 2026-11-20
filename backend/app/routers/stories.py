"""
Campmatch Stories - Snapchat-style ephemeral stories.

Normal users: stories expire after 24 hours.
Plus users: can choose 6h, 12h, or 24h duration.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models import User, Story, StoryView
from ..security import decode_token, get_bool_setting, get_setting

router = APIRouter()


class StoryCreate(BaseModel):
    media_url: str
    media_type: str = "image"  # image | video
    caption: str = ""
    duration_hours: int = 24  # 6, 12, or 24


class StoryResponse(BaseModel):
    id: int
    user_id: int
    media_url: str
    media_type: str
    caption: str
    duration_hours: int
    expires_at: str
    created_at: str
    view_count: int
    is_active: bool
    viewed_by_me: bool = False

    class Config:
        from_attributes = True


def _get_user_from_token(token: str, db: Session) -> User | None:
    try:
        payload = decode_token(token)
        if payload.get("typ") != "access":
            return None
        user_id = int(payload["sub"])
        token_version = int(payload.get("ver", 1))
    except Exception:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.is_deleted or not user.is_active:
        return None
    if (user.token_version or 1) != token_version:
        return None
    return user


def _auth_user(authorization: str | None, db: Session) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required.")
    user = _get_user_from_token(authorization[7:], db)
    if not user:
        raise HTTPException(401, "Invalid or expired token.")
    return user


def _is_plus(user: User) -> bool:
    return bool(user.is_premium and user.premium_until and user.premium_until > datetime.now(timezone.utc))


def _allowed_durations(is_plus_user: bool) -> List[int]:
    if is_plus_user:
        return [6, 12, 24]
    return [24]


@router.post("/stories", response_model=StoryResponse)
def create_story(
    data: StoryCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    user = _auth_user(authorization, db)

    # Validate duration based on Plus status
    plus = _is_plus(user)
    allowed = _allowed_durations(plus)
    if data.duration_hours not in allowed:
        raise HTTPException(
            400,
            f"Duration {data.duration_hours}h not allowed. Plus users can choose 6h, 12h, or 24h. Free users: 24h only.",
        )

    # Deactivate user's existing active stories (one active story at a time)
    db.query(Story).filter(Story.user_id == user.id, Story.is_active == True).update(
        {Story.is_active: False}
    )

    expires_at = datetime.now(timezone.utc) + timedelta(hours=data.duration_hours)
    story = Story(
        user_id=user.id,
        media_url=data.media_url,
        media_type=data.media_type,
        caption=data.caption,
        duration_hours=data.duration_hours,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(story)
    db.commit()
    db.refresh(story)

    return StoryResponse(
        id=story.id,
        user_id=story.user_id,
        media_url=story.media_url,
        media_type=story.media_type,
        caption=story.caption,
        duration_hours=story.duration_hours,
        expires_at=story.expires_at.isoformat(),
        created_at=story.created_at.isoformat(),
        view_count=story.view_count,
        is_active=story.is_active,
        viewed_by_me=False,
    )


@router.get("/stories/feed", response_model=List[StoryResponse])
def get_stories_feed(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
    limit: int = Query(20, le=50),
):
    """Get active stories from users the viewer follows / is connected with.
    For MVP, returns all active non-expired stories."""
    viewer = _auth_user(authorization, db)
    now = datetime.now(timezone.utc)

    # Get active, non-expired stories (excluding viewer's own)
    stories = (
        db.query(Story)
        .filter(
            Story.is_active == True,
            Story.expires_at > now,
            Story.user_id != viewer.id,
        )
        .order_by(Story.created_at.desc())
        .limit(limit)
        .all()
    )

    results = []
    for s in stories:
        # Check if viewer has seen this story
        viewed = (
            db.query(StoryView)
            .filter(StoryView.story_id == s.id, StoryView.viewer_id == viewer.id)
            .first()
        )
        results.append(
            StoryResponse(
                id=s.id,
                user_id=s.user_id,
                media_url=s.media_url,
                media_type=s.media_type,
                caption=s.caption,
                duration_hours=s.duration_hours,
                expires_at=s.expires_at.isoformat(),
                created_at=s.created_at.isoformat(),
                view_count=s.view_count,
                is_active=s.is_active,
                viewed_by_me=viewed is not None,
            )
        )
    return results


@router.get("/stories/my", response_model=List[StoryResponse])
def get_my_stories(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    """Get the current user's active stories."""
    user = _auth_user(authorization, db)
    now = datetime.now(timezone.utc)

    stories = (
        db.query(Story)
        .filter(Story.user_id == user.id, Story.is_active == True, Story.expires_at > now)
        .order_by(Story.created_at.desc())
        .all()
    )

    return [
        StoryResponse(
            id=s.id,
            user_id=s.user_id,
            media_url=s.media_url,
            media_type=s.media_type,
            caption=s.caption,
            duration_hours=s.duration_hours,
            expires_at=s.expires_at.isoformat(),
            created_at=s.created_at.isoformat(),
            view_count=s.view_count,
            is_active=s.is_active,
            viewed_by_me=False,
        )
        for s in stories
    ]


@router.post("/stories/{story_id}/view")
def view_story(
    story_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    """Record that the current user viewed a story."""
    viewer = _auth_user(authorization, db)
    now = datetime.now(timezone.utc)

    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(404, "Story not found.")
    if not story.is_active or story.expires_at <= now:
        raise HTTPException(404, "Story is no longer available.")
    if story.user_id == viewer.id:
        return {"ok": True, "message": "Cannot view your own story."}

    # Record view (unique per viewer)
    existing = (
        db.query(StoryView)
        .filter(StoryView.story_id == story_id, StoryView.viewer_id == viewer.id)
        .first()
    )
    if not existing:
        db.add(StoryView(story_id=story_id, viewer_id=viewer.id))
        story.view_count = (story.view_count or 0) + 1
        db.commit()

    return {"ok": True, "view_count": story.view_count}


@router.delete("/stories/{story_id}")
def delete_story(
    story_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    """Delete the current user's story."""
    user = _auth_user(authorization, db)
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(404, "Story not found.")
    if story.user_id != user.id:
        raise HTTPException(403, "Not your story.")
    story.is_active = False
    db.commit()
    return {"ok": True}
