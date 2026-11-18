import os
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db, UPLOAD_DIR
from ..models import User, Swipe, Match, ImageModerationLog
from ..security import (
    decode_token,
    create_token,
    hash_password,
    verify_password,
    detect_school,
    get_bool_setting,
    get_int_setting,
    get_float_setting,
    get_setting,
)
from ..image_guard import validate_and_optimize_profile_photo
from ..realtime import hub
from ..explore_rooms import active_slugs, DEFAULT_EXPLORE_ROOMS

router = APIRouter()

# Kept for backwards compatibility with older imports.
VALID_EXPLORE_VIBES = {r["slug"] for r in DEFAULT_EXPLORE_ROOMS}


class PromptItem(BaseModel):
    question: str
    answer: str


class ProfileIn(BaseModel):
    name: str
    level: str
    age: int
    course: str
    gender: str
    interested_in: str
    bio: str = ""
    min_age: int = 18
    max_age: int = 30
    preferred_levels: str = ""
    show_me: str = "everyone"
    max_distance_km: int = 50
    verified_only: bool = False
    snoozed: bool = False
    mode: str = "date"
    looking_for: str = "Long-term partner"
    interests: List[str] = []
    explore_vibes: Optional[List[str]] = None
    prompts: List[PromptItem] = []
    opening_move: str = ""
    hall: str = ""
    zodiac: str = ""
    height: str = ""
    spotify_anthem: str = ""
    photo_urls: Optional[List[str]] = None


class LocationIn(BaseModel):
    lat: float
    lng: float


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountIn(BaseModel):
    reason: str = "Personal preference"
    password: str = ""
    confirm_text: str = ""


def parse_prompts(raw: Optional[str]):
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def parse_list(raw: Optional[str]):
    if not raw:
        return []
    return [x.strip() for x in raw.split(",") if x.strip()]


def compute_swipe_quota(user: User, db: Session) -> dict:
    plus_enabled = get_bool_setting(db, "plus_enabled", False)
    daily_limit = get_int_setting(db, "free_daily_swipe_limit", 10)
    super_free = get_int_setting(db, "free_daily_super_likes", 3)
    super_plus = get_int_setting(db, "plus_daily_super_likes", 10)

    window_start = datetime.utcnow() - timedelta(hours=24)
    recent_swipes = (
        db.query(Swipe)
        .filter(Swipe.swiper_id == user.id, Swipe.created_at >= window_start)
        .order_by(Swipe.created_at.asc())
        .all()
    )
    used_swipes = len(recent_swipes)
    used_supers = sum(1 for s in recent_swipes if s.super_liked)

    is_limited = bool(plus_enabled and not user.is_premium)
    resets_at = None
    if is_limited and recent_swipes and used_swipes >= daily_limit:
        resets_at = (recent_swipes[0].created_at + timedelta(hours=24)).isoformat()

    super_limit = super_plus if user.is_premium else super_free
    return {
        "limited": is_limited,
        "daily_limit": daily_limit if is_limited else None,
        "used_today": used_swipes,
        "remaining": max(0, daily_limit - used_swipes) if is_limited else None,
        "resets_at": resets_at,
        "super_limit": super_limit,
        "super_used": used_supers,
        "super_remaining": max(0, super_limit - used_supers),
    }


def serialize_user(user: User, full: bool = False, db: Optional[Session] = None):
    photos = parse_list(user.photo_urls)
    interests = parse_list(user.interests)
    explore_vibes = parse_list(user.explore_vibes)
    prompts = parse_prompts(user.prompts)

    checks = [
        bool(user.name),
        bool(user.course),
        bool(user.level),
        len(photos) >= 1,
        len(photos) >= 3,
        bool(user.bio and len(user.bio.strip()) >= 15),
        len(interests) >= 3,
        len(prompts) >= 1,
        bool(user.opening_move),
        len(explore_vibes) >= 1 or bool(user.hall),
    ]
    completion = int(round((sum(1 for c in checks if c) / len(checks)) * 100))

    now = datetime.utcnow()
    is_boosted = bool(user.boosted_until and user.boosted_until > now)
    is_online = hub.is_online(user.id)
    active_recently = is_online or bool(user.last_active and (now - user.last_active).total_seconds() < 1800)

    display_email = user.original_email or user.email
    data = {
        "id": user.id,
        "name": user.name or "",
        "level": user.level or "100",
        "age": user.age or 20,
        "course": user.course or "",
        "gender": user.gender or "female",
        "interested_in": user.interested_in or "male",
        "school": user.school or detect_school(display_email),
        "hall": user.hall or "",
        "photo_urls": photos,
        "bio": user.bio or "",
        "mode": user.mode or "date",
        "looking_for": user.looking_for or "Long-term partner",
        "interests": interests,
        "explore_vibes": explore_vibes,
        "prompts": prompts,
        "opening_move": user.opening_move or "",
        "zodiac": user.zodiac or "",
        "height": user.height or "",
        "spotify_anthem": user.spotify_anthem or "",
        "verified": True,
        "is_premium": bool(user.is_premium),
        "is_boosted": is_boosted,
        "boosted_until": user.boosted_until.isoformat() if is_boosted and user.boosted_until else None,
        "online": is_online,
        "active_recently": active_recently,
    }
    if full:
        data.update({
            "email": display_email,
            "profile_complete": bool(user.profile_complete),
            "completion_pct": completion,
            "is_admin": bool(user.is_admin),
            "snoozed": bool(user.snoozed),
            "premium_until": user.premium_until.isoformat() if user.premium_until else None,
            "min_age": user.min_age or 18,
            "max_age": user.max_age or 30,
            "preferred_levels": user.preferred_levels or "",
            "show_me": user.show_me or "everyone",
            "max_distance_km": user.max_distance_km or 50,
            "verified_only": bool(user.verified_only),
        })
        if db is not None:
            data["swipe_quota"] = compute_swipe_quota(user, db)
            data["announcement_banner"] = get_setting(db, "announcement_banner", "")
    return data


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required.")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
        token_ver = payload.get("ver", 1)
    except Exception:
        raise HTTPException(401, "Invalid or expired session token.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.is_deleted or not user.is_active:
        raise HTTPException(401, "Account is inactive or no longer available.")
    if (user.token_version or 1) != token_ver:
        raise HTTPException(401, "Session has expired. Please sign in again.")

    now = datetime.utcnow()
    if user.is_premium and user.premium_until and user.premium_until < now and not user.is_admin:
        user.is_premium = False
    user.last_active = now
    db.commit()
    return user


@router.get("/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return serialize_user(user, full=True, db=db)


@router.get("/plus-status")
def plus_status(db: Session = Depends(get_db)):
    return {
        "enabled": get_bool_setting(db, "plus_enabled", False),
        "price_ghs": get_float_setting(db, "plus_price_ghs", 25.0),
        "duration_days": get_int_setting(db, "plus_duration_days", 30),
        "free_daily_swipe_limit": get_int_setting(db, "free_daily_swipe_limit", 10),
        "announcement_banner": get_setting(db, "announcement_banner", ""),
    }


@router.post("/profile")
def update_profile(data: ProfileIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not data.name.strip() or not data.course.strip():
        raise HTTPException(400, "Name and programme are required.")

    user.name = data.name.strip()[:100]
    user.level = data.level[:20]
    user.age = max(18, min(60, int(data.age)))
    user.course = data.course.strip()[:100]
    user.gender = data.gender if data.gender in ("male", "female") else "female"
    user.interested_in = data.interested_in if data.interested_in in ("male", "female", "everyone") else "everyone"
    user.bio = data.bio.strip()[:600]
    user.min_age = max(18, min(60, int(data.min_age)))
    user.max_age = max(user.min_age, min(65, int(data.max_age)))
    user.preferred_levels = data.preferred_levels[:100]
    user.show_me = data.show_me[:20]
    user.max_distance_km = max(5, min(500, int(data.max_distance_km)))
    user.verified_only = bool(data.verified_only)
    user.snoozed = bool(data.snoozed)
    user.mode = data.mode if data.mode in ("date", "bff", "study") else "date"
    user.looking_for = data.looking_for[:60]
    user.interests = ",".join([i.strip()[:40] for i in data.interests[:8] if i.strip()])
    if data.explore_vibes is not None:
        allowed = active_slugs(db) or VALID_EXPLORE_VIBES
        clean_vibes = list(dict.fromkeys(v.strip() for v in data.explore_vibes if v.strip() in allowed))
        user.explore_vibes = ",".join(clean_vibes)
    user.prompts = json.dumps(
        [{"question": p.question.strip()[:120], "answer": p.answer.strip()[:280]} for p in data.prompts[:3] if p.answer.strip()]
    )
    user.opening_move = data.opening_move.strip()[:255]
    user.hall = data.hall.strip()[:100]
    user.zodiac = data.zodiac.strip()[:30]
    user.height = data.height.strip()[:20]
    user.spotify_anthem = data.spotify_anthem.strip()[:160]

    if not user.school:
        user.school = detect_school(user.original_email or user.email)

    if data.photo_urls is not None:
        existing_set = set(parse_list(user.photo_urls))
        valid_reordered = [u for u in data.photo_urls if u in existing_set][:6]
        if valid_reordered:
            user.photo_urls = ",".join(valid_reordered)

    photos = parse_list(user.photo_urls)
    user.profile_complete = bool(len(photos) >= 1 and user.name and user.course)
    db.commit()
    return {"ok": True, "profile_complete": user.profile_complete, "user": serialize_user(user, full=True, db=db)}


@router.post("/profile/photos")
async def upload_photos(
    files: list[UploadFile] = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = parse_list(user.photo_urls)
    slots_left = max(0, 6 - len(existing))
    if slots_left == 0:
        raise HTTPException(400, "You already have the maximum of 6 profile photos.")

    accepted_urls = []
    rejected_files = []

    for file in files[:slots_left]:
        fname = (file.filename or "photo.jpg")[:200]
        raw_bytes = await file.read()
        check = validate_and_optimize_profile_photo(raw_bytes)

        db.add(
            ImageModerationLog(
                user_id=user.id,
                filename=fname,
                accepted=check.accepted,
                reject_code=check.reject_code,
                reason=check.reason,
                metrics_json=json.dumps(check.metrics),
            )
        )

        if not check.accepted:
            rejected_files.append({
                "filename": fname,
                "code": check.reject_code,
                "reason": check.reason,
            })
            continue

        out_name = f"{user.id}_{uuid.uuid4().hex[:10]}.webp"
        out_path = os.path.join(UPLOAD_DIR, out_name)
        with open(out_path, "wb") as f:
            f.write(check.processed_bytes)
        accepted_urls.append(f"/uploads/{out_name}")

    if accepted_urls:
        user.photo_urls = ",".join((existing + accepted_urls)[:6])
        if user.name and user.course:
            user.profile_complete = True

    db.commit()

    if not accepted_urls and rejected_files:
        primary = rejected_files[0]
        raise HTTPException(
            status_code=400,
            detail={
                "message": primary["reason"],
                "code": primary["code"],
                "rejected": rejected_files,
            },
        )

    return {
        "photo_urls": parse_list(user.photo_urls),
        "accepted_count": len(accepted_urls),
        "rejected": rejected_files,
    }


@router.delete("/profile/photos")
def remove_photo(url: str = Query(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = parse_list(user.photo_urls)
    if user.profile_complete and len(existing) <= 1:
        raise HTTPException(400, "At least one verified profile photo is required.")
    updated = [p for p in existing if p != url]
    user.photo_urls = ",".join(updated)
    db.commit()
    return {"photo_urls": updated}


@router.post("/profile/location")
def update_location(data: LocationIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if -90 <= data.lat <= 90 and -180 <= data.lng <= 180:
        user.lat = data.lat
        user.lng = data.lng
        db.commit()
    return {"ok": True}


@router.post("/account/password")
def change_password(data: PasswordChangeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect.")
    if len(data.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters long.")
    user.password_hash = hash_password(data.new_password)
    user.token_version = (user.token_version or 1) + 1
    db.commit()
    return {"ok": True, "token": create_token(user.id, user.token_version)}


@router.post("/account/delete")
async def delete_my_account(
    data: DeleteAccountIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Soft-delete user account: removes user from all public surfaces, decks, and active matches
    while preserving 100% of historical database records (user profile, swipes, matches,
    messages, payments, reports, and moderation logs).
    """
    if data.password:
        if not verify_password(data.password, user.password_hash):
            raise HTTPException(400, "Incorrect password.")
    elif data.confirm_text.strip().upper() != "DELETE":
        raise HTTPException(400, "Type DELETE or enter your password to confirm account deletion.")

    now = datetime.utcnow()
    orig = user.original_email or user.email
    user.original_email = orig
    user.email = f"deleted_{user.id}_{int(time.time())}__{orig}"
    user.is_deleted = True
    user.is_active = False
    user.snoozed = True
    user.deleted_at = now
    user.deletion_reason = (data.reason or "User requested deletion").strip()[:255]
    user.token_version = (user.token_version or 1) + 1

    # Deactivate active matches for the other party while keeping all Match & Message rows intact
    active_matches = (
        db.query(Match)
        .filter(
            ((Match.user1_id == user.id) | (Match.user2_id == user.id)),
            Match.is_active == True,
        )
        .all()
    )
    affected_partner_ids = []
    for m in active_matches:
        m.is_active = False
        m.unmatched_by = user.id
        m.unmatched_at = now
        partner_id = m.user2_id if m.user1_id == user.id else m.user1_id
        affected_partner_ids.append((partner_id, m.id))

    db.commit()

    for partner_id, match_id in affected_partner_ids:
        await hub.send_to_user(partner_id, {"type": "match_removed", "match_id": match_id})
    await hub.send_to_user(user.id, {"type": "account_terminated"})

    return {"ok": True}
