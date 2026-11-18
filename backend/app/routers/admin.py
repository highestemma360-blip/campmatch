import json
import os
import re
import time
import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
import httpx

from ..database import get_db, UPLOAD_DIR, BACKUP_DIR, DATA_DIR, BACKEND_ROOT, backup_sqlite, list_backups, sqlite_file_path, directory_size, count_files, IS_SQLITE
from ..models import (
    User,
    Swipe,
    Match,
    Message,
    Payment,
    Report,
    ImageModerationLog,
    AdminAuditLog,
    ExploreRoom,
    Notification,
    NotificationRead,
)
from ..security import (
    get_bool_setting,
    get_int_setting,
    get_float_setting,
    get_setting,
    set_setting,
    get_allowed_domains,
)
from ..realtime import hub
from ..explore_rooms import all_rooms, active_slugs, serialize_room, ICON_CHOICES
from .. import push
from .profiles import get_current_user, parse_list, parse_prompts

router = APIRouter()


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Administrator privileges required.")
    return user


def log_audit(db: Session, admin_id: int, action: str, target_user_id: Optional[int] = None, details: str = ""):
    db.add(
        AdminAuditLog(
            admin_id=admin_id,
            action=action[:100],
            target_user_id=target_user_id,
            details=details[:1000],
        )
    )


def build_platform_settings_snapshot(db: Session) -> dict:
    return {
        "plus_enabled": get_bool_setting(db, "plus_enabled", False),
        "free_daily_swipe_limit": get_int_setting(db, "free_daily_swipe_limit", 10),
        "plus_price_ghs": get_float_setting(db, "plus_price_ghs", 25.0),
        "plus_duration_days": get_int_setting(db, "plus_duration_days", 30),
        "plus_price_3m": get_float_setting(db, "plus_price_3m", 60.0),
        "plus_price_12m": get_float_setting(db, "plus_price_12m", 200.0),
        "plus_discount_percent": get_float_setting(db, "plus_discount_percent", 0.0),
        "plus_discount_enabled": get_bool_setting(db, "plus_discount_enabled", False),
        "free_daily_super_likes": get_int_setting(db, "free_daily_super_likes", 3),
        "plus_daily_super_likes": get_int_setting(db, "plus_daily_super_likes", 10),
        "umat_only": get_bool_setting(db, "umat_only", True),
        "allowed_domains": get_setting(db, "allowed_domains", ""),
        "active_domains_list": get_allowed_domains(db),
        "signups_enabled": get_bool_setting(db, "signups_enabled", True),
        "maintenance_mode": get_bool_setting(db, "maintenance_mode", False),
        "announcement_banner": get_setting(db, "announcement_banner", ""),
    }


@router.get("/stats")
def stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    day_ago = now - timedelta(hours=24)

    total_active_users = db.query(User).filter(User.is_deleted == False).count()
    deleted_users = db.query(User).filter(User.is_deleted == True).count()
    suspended_users = db.query(User).filter(User.is_deleted == False, User.is_active == False).count()
    complete_profiles = db.query(User).filter(User.is_deleted == False, User.profile_complete == True).count()
    premium_users = db.query(User).filter(User.is_deleted == False, User.is_premium == True).count()

    swipes_total = db.query(Swipe).count()
    swipes_today = db.query(Swipe).filter(Swipe.created_at >= day_ago).count()
    matches_total = db.query(Match).count()
    matches_active = db.query(Match).filter(Match.is_active == True).count()
    matches_today = db.query(Match).filter(Match.created_at >= day_ago).count()
    messages_total = db.query(Message).count()
    messages_today = db.query(Message).filter(Message.created_at >= day_ago).count()

    payments_success = db.query(Payment).filter(Payment.status == "success").count()
    revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == "success").scalar() or 0.0
    open_reports = db.query(Report).filter(Report.resolved == False).count()
    rejected_uploads = db.query(ImageModerationLog).filter(ImageModerationLog.accepted == False).count()

    # University distribution
    school_rows = (
        db.query(User.school, func.count(User.id))
        .filter(User.is_deleted == False)
        .group_by(User.school)
        .all()
    )
    schools = [{"school": s or "Unspecified", "count": c} for s, c in school_rows]
    schools.sort(key=lambda x: x["count"], reverse=True)

    # 7-day daily activity trend
    daily_series = []
    for days_back in range(6, -1, -1):
        day_start = (now - timedelta(days=days_back)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        daily_series.append({
            "date": day_start.strftime("%b %d"),
            "signups": db.query(User).filter(User.created_at >= day_start, User.created_at < day_end).count(),
            "swipes": db.query(Swipe).filter(Swipe.created_at >= day_start, Swipe.created_at < day_end).count(),
            "messages": db.query(Message).filter(Message.created_at >= day_start, Message.created_at < day_end).count(),
        })

    return {
        "overview": {
            "active_users": total_active_users,
            "online_now": hub.online_count(),
            "complete_profiles": complete_profiles,
            "premium_users": premium_users,
            "suspended_users": suspended_users,
            "deleted_vault": deleted_users,
            "swipes_today": swipes_today,
            "swipes_total": swipes_total,
            "matches_today": matches_today,
            "matches_active": matches_active,
            "matches_total": matches_total,
            "messages_today": messages_today,
            "messages_total": messages_total,
            "payments_success": payments_success,
            "revenue_ghs": round(float(revenue), 2),
            "open_reports": open_reports,
            "rejected_uploads": rejected_uploads,
        },
        "schools": schools,
        "daily_series": daily_series,
    }


class PlatformSettingsIn(BaseModel):
    plus_enabled: Optional[bool] = None
    free_daily_swipe_limit: Optional[int] = None
    plus_price_ghs: Optional[float] = None
    plus_duration_days: Optional[int] = None
    plus_price_3m: Optional[float] = None
    plus_price_12m: Optional[float] = None
    plus_discount_percent: Optional[float] = None
    plus_discount_enabled: Optional[bool] = None
    free_daily_super_likes: Optional[int] = None
    plus_daily_super_likes: Optional[int] = None
    umat_only: Optional[bool] = None
    allowed_domains: Optional[str] = None
    signups_enabled: Optional[bool] = None
    maintenance_mode: Optional[bool] = None
    announcement_banner: Optional[str] = None


@router.get("/settings")
def get_settings(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return build_platform_settings_snapshot(db)


@router.put("/settings")
async def update_settings(data: PlatformSettingsIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    changes = []
    if data.plus_enabled is not None:
        set_setting(db, "plus_enabled", "true" if data.plus_enabled else "false")
        changes.append(f"plus_enabled={data.plus_enabled}")
    if data.free_daily_swipe_limit is not None:
        limit = max(1, min(500, int(data.free_daily_swipe_limit)))
        set_setting(db, "free_daily_swipe_limit", str(limit))
        changes.append(f"free_daily_swipe_limit={limit}")
    if data.plus_price_ghs is not None:
        price = max(1.0, round(float(data.plus_price_ghs), 2))
        set_setting(db, "plus_price_ghs", str(price))
        changes.append(f"plus_price_ghs={price}")
    if data.plus_duration_days is not None:
        dur = max(1, min(365, int(data.plus_duration_days)))
        set_setting(db, "plus_duration_days", str(dur))
        changes.append(f"plus_duration_days={dur}")
    if data.plus_price_3m is not None:
        p3 = max(1.0, round(float(data.plus_price_3m), 2))
        set_setting(db, "plus_price_3m", str(p3))
        changes.append(f"plus_price_3m={p3}")
    if data.plus_price_12m is not None:
        p12 = max(1.0, round(float(data.plus_price_12m), 2))
        set_setting(db, "plus_price_12m", str(p12))
        changes.append(f"plus_price_12m={p12}")
    if data.plus_discount_percent is not None:
        pct = max(0.0, min(90.0, round(float(data.plus_discount_percent), 2)))
        set_setting(db, "plus_discount_percent", str(pct))
        changes.append(f"plus_discount_percent={pct}")
    if data.plus_discount_enabled is not None:
        set_setting(db, "plus_discount_enabled", "true" if data.plus_discount_enabled else "false")
        changes.append(f"plus_discount_enabled={data.plus_discount_enabled}")
    if data.free_daily_super_likes is not None:
        sf = max(0, min(50, int(data.free_daily_super_likes)))
        set_setting(db, "free_daily_super_likes", str(sf))
        changes.append(f"free_daily_super_likes={sf}")
    if data.plus_daily_super_likes is not None:
        sp = max(1, min(100, int(data.plus_daily_super_likes)))
        set_setting(db, "plus_daily_super_likes", str(sp))
        changes.append(f"plus_daily_super_likes={sp}")
    if data.umat_only is not None:
        set_setting(db, "umat_only", "true" if data.umat_only else "false")
        changes.append(f"umat_only={data.umat_only}")
    if data.allowed_domains is not None:
        cleaned = ",".join(
            d.strip().lower() if d.strip().startswith("@") else f"@{d.strip().lower()}"
            for d in data.allowed_domains.split(",")
            if d.strip()
        )
        set_setting(db, "allowed_domains", cleaned)
        changes.append("allowed_domains updated")
    if data.signups_enabled is not None:
        set_setting(db, "signups_enabled", "true" if data.signups_enabled else "false")
        changes.append(f"signups_enabled={data.signups_enabled}")
    if data.maintenance_mode is not None:
        set_setting(db, "maintenance_mode", "true" if data.maintenance_mode else "false")
        changes.append(f"maintenance_mode={data.maintenance_mode}")
    if data.announcement_banner is not None:
        set_setting(db, "announcement_banner", data.announcement_banner.strip()[:240])
        changes.append("announcement_banner updated")

    if changes:
        log_audit(db, admin.id, "update_settings", details=", ".join(changes))
        db.commit()

    snapshot = build_platform_settings_snapshot(db)
    await hub.broadcast({
        "type": "platform_config",
        "plus_enabled": snapshot["plus_enabled"],
        "free_daily_swipe_limit": snapshot["free_daily_swipe_limit"],
        "plus_price_ghs": snapshot["plus_price_ghs"],
        "plus_duration_days": snapshot["plus_duration_days"],
        "announcement_banner": snapshot["announcement_banner"],
    })
    return snapshot


@router.post("/settings/plus")
async def toggle_plus(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    next_val = not get_bool_setting(db, "plus_enabled", False)
    set_setting(db, "plus_enabled", "true" if next_val else "false")
    log_audit(db, admin.id, "toggle_plus", details=f"plus_enabled={next_val}")
    db.commit()
    snapshot = build_platform_settings_snapshot(db)
    await hub.broadcast({
        "type": "platform_config",
        "plus_enabled": snapshot["plus_enabled"],
        "free_daily_swipe_limit": snapshot["free_daily_swipe_limit"],
        "plus_price_ghs": snapshot["plus_price_ghs"],
        "plus_duration_days": snapshot["plus_duration_days"],
        "announcement_banner": snapshot["announcement_banner"],
    })
    return {"plus_enabled": next_val}


@router.post("/settings/umat")
def toggle_umat(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    next_val = not get_bool_setting(db, "umat_only", True)
    set_setting(db, "umat_only", "true" if next_val else "false")
    log_audit(db, admin.id, "toggle_umat", details=f"umat_only={next_val}")
    db.commit()
    return {"umat_only": next_val}


@router.get("/users")
def list_users(
    status: str = Query("all"),
    q: str = Query(""),
    school: str = Query(""),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(User)
    if status == "deleted":
        query = query.filter(User.is_deleted == True)
    elif status == "suspended":
        query = query.filter(User.is_deleted == False, User.is_active == False)
    elif status == "plus":
        query = query.filter(User.is_deleted == False, User.is_premium == True)
    elif status == "incomplete":
        query = query.filter(User.is_deleted == False, User.profile_complete == False)
    elif status == "admin":
        query = query.filter(User.is_deleted == False, User.is_admin == True)
    elif status == "active":
        query = query.filter(User.is_deleted == False, User.is_active == True)
    else:
        query = query.filter(User.is_deleted == False)

    if school:
        query = query.filter(User.school == school)

    users = query.order_by(User.created_at.desc()).limit(300).all()
    q_low = q.strip().lower()
    out = []
    for u in users:
        disp_email = u.original_email or u.email
        if q_low and q_low not in (u.name or "").lower() and q_low not in disp_email.lower() and q_low not in (u.course or "").lower():
            continue
        photos = parse_list(u.photo_urls)
        out.append({
            "id": u.id,
            "email": disp_email,
            "name": u.name or "",
            "school": u.school or "",
            "hall": u.hall or "",
            "level": u.level or "",
            "age": u.age,
            "course": u.course or "",
            "gender": u.gender or "",
            "photo_url": photos[0] if photos else None,
            "photo_urls": photos,
            "profile_complete": bool(u.profile_complete),
            "is_premium": bool(u.is_premium),
            "premium_until": u.premium_until.isoformat() if u.premium_until else None,
            "is_active": bool(u.is_active),
            "is_admin": bool(u.is_admin),
            "is_deleted": bool(u.is_deleted),
            "deleted_at": u.deleted_at.isoformat() if u.deleted_at else None,
            "deletion_reason": u.deletion_reason or "",
            "online": hub.is_online(u.id),
            "created_at": u.created_at.isoformat() if u.created_at else "",
            "last_active": u.last_active.isoformat() if u.last_active else "",
        })
    return out


@router.get("/users/{user_id}")
def inspect_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found.")

    swipes_made = db.query(Swipe).filter(Swipe.swiper_id == u.id).count()
    likes_received = db.query(Swipe).filter(Swipe.swiped_id == u.id, Swipe.liked == True).count()
    matches_count = db.query(Match).filter((Match.user1_id == u.id) | (Match.user2_id == u.id)).count()
    messages_sent = db.query(Message).filter(Message.sender_id == u.id).count()
    reports_against = db.query(Report).filter(Report.reported_id == u.id).count()
    payments_list = db.query(Payment).filter(Payment.user_id == u.id).order_by(Payment.created_at.desc()).all()
    mod_logs = (
        db.query(ImageModerationLog)
        .filter(ImageModerationLog.user_id == u.id)
        .order_by(ImageModerationLog.created_at.desc())
        .limit(20)
        .all()
    )

    return {
        "id": u.id,
        "email": u.original_email or u.email,
        "raw_email": u.email,
        "name": u.name or "",
        "age": u.age,
        "gender": u.gender,
        "interested_in": u.interested_in,
        "school": u.school,
        "hall": u.hall,
        "level": u.level,
        "course": u.course,
        "bio": u.bio or "",
        "looking_for": u.looking_for or "",
        "interests": parse_list(u.interests),
        "prompts": parse_prompts(u.prompts),
        "opening_move": u.opening_move or "",
        "photo_urls": parse_list(u.photo_urls),
        "profile_complete": bool(u.profile_complete),
        "is_active": bool(u.is_active),
        "is_admin": bool(u.is_admin),
        "is_premium": bool(u.is_premium),
        "ban_type": u.ban_type or "",
        "banned_until": u.banned_until.isoformat() if u.banned_until else None,
        "ban_reason": u.ban_reason or "",
        "banned_at": u.banned_at.isoformat() if u.banned_at else None,
        "premium_until": u.premium_until.isoformat() if u.premium_until else None,
        "is_deleted": bool(u.is_deleted),
        "deleted_at": u.deleted_at.isoformat() if u.deleted_at else None,
        "deletion_reason": u.deletion_reason or "",
        "online": hub.is_online(u.id),
        "created_at": u.created_at.isoformat() if u.created_at else "",
        "last_active": u.last_active.isoformat() if u.last_active else "",
        "activity": {
            "swipes_made": swipes_made,
            "likes_received": likes_received,
            "matches_total": matches_count,
            "messages_sent": messages_sent,
            "reports_against": reports_against,
        },
        "payments": [
            {
                "id": p.id,
                "amount": p.amount,
                "currency": p.currency,
                "status": p.status,
                "reference": p.reference,
                "created_at": p.created_at.isoformat() if p.created_at else "",
            }
            for p in payments_list
        ],
        "moderation_logs": [
            {
                "id": m.id,
                "filename": m.filename,
                "accepted": m.accepted,
                "reject_code": m.reject_code,
                "reason": m.reason,
                "created_at": m.created_at.isoformat() if m.created_at else "",
            }
            for m in mod_logs
        ],
    }


class AdminUserUpdateIn(BaseModel):
    name: Optional[str] = None
    level: Optional[str] = None
    course: Optional[str] = None
    school: Optional[str] = None
    bio: Optional[str] = None
    is_active: Optional[bool] = None
    is_premium: Optional[bool] = None
    plus_days: Optional[int] = None
    is_admin: Optional[bool] = None
    boost_minutes: Optional[int] = None


@router.put("/users/{user_id}")
async def admin_update_user(
    user_id: int,
    data: AdminUserUpdateIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found.")

    notes = []
    if data.name is not None:
        u.name = data.name.strip()[:100]
        notes.append("name")
    if data.level is not None:
        u.level = data.level.strip()[:20]
        notes.append("level")
    if data.course is not None:
        u.course = data.course.strip()[:100]
        notes.append("course")
    if data.school is not None:
        u.school = data.school.strip()[:100]
        notes.append("school")
    if data.bio is not None:
        u.bio = data.bio.strip()[:600]
        notes.append("bio")
    if data.is_active is not None:
        u.is_active = bool(data.is_active)
        notes.append(f"is_active={u.is_active}")
        if not u.is_active:
            u.token_version = (u.token_version or 1) + 1
            await hub.send_to_user(u.id, {"type": "account_terminated"})
    if data.is_premium is not None:
        u.is_premium = bool(data.is_premium)
        if u.is_premium:
            days = data.plus_days or 30
            u.premium_until = datetime.utcnow() + timedelta(days=days)
        else:
            u.premium_until = None
        notes.append(f"is_premium={u.is_premium}")
        await hub.send_to_user(
            u.id,
            {"type": "plus_activated", "is_premium": u.is_premium, "premium_until": u.premium_until.isoformat() if u.premium_until else None},
        )
    if data.is_admin is not None and u.id != admin.id:
        u.is_admin = bool(data.is_admin)
        notes.append(f"is_admin={u.is_admin}")
    if data.boost_minutes is not None:
        if data.boost_minutes > 0:
            u.boosted_until = datetime.utcnow() + timedelta(minutes=data.boost_minutes)
        else:
            u.boosted_until = None
        notes.append(f"boost={data.boost_minutes}m")

    log_audit(db, admin.id, "update_user", target_user_id=u.id, details=", ".join(notes))
    db.commit()
    return {"ok": True}


@router.post("/users/{user_id}/toggle-active")
async def toggle_active(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404)
    if u.id == admin.id:
        raise HTTPException(400, "Cannot suspend your own administrator account.")
    u.is_active = not u.is_active
    if not u.is_active:
        u.token_version = (u.token_version or 1) + 1
        await hub.send_to_user(u.id, {"type": "account_terminated"})
    log_audit(db, admin.id, "toggle_active", target_user_id=u.id, details=f"is_active={u.is_active}")
    db.commit()
    return {"ok": True, "is_active": u.is_active}


class BanUserIn(BaseModel):
    mode: str = "temporary"  # temporary | permanent
    days: int = 7
    reason: str = ""


@router.post("/users/{user_id}/ban")
async def ban_user(user_id: int, data: BanUserIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found.")
    if u.id == admin.id:
        raise HTTPException(400, "You cannot ban your own administrator account.")
    mode = "permanent" if data.mode == "permanent" else "temporary"
    u.ban_type = mode
    u.ban_reason = data.reason.strip()[:255]
    u.banned_at = datetime.utcnow()
    u.banned_by = admin.id
    u.banned_until = None if mode == "permanent" else (datetime.utcnow() + timedelta(days=max(1, min(365, int(data.days or 7)))))
    u.is_active = False
    u.snoozed = True
    u.token_version = (u.token_version or 1) + 1
    log_audit(db, admin.id, f"ban_{mode}", target_user_id=u.id, details=u.ban_reason or f"{data.days}d")
    db.commit()
    await hub.send_to_user(u.id, {"type": "account_terminated"})
    return {"ok": True, "ban_type": mode, "banned_until": u.banned_until.isoformat() if u.banned_until else None}


@router.post("/users/{user_id}/unban")
async def unban_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found.")
    u.ban_type = ""
    u.banned_until = None
    u.ban_reason = ""
    u.banned_at = None
    u.banned_by = None
    u.is_active = True
    u.snoozed = False
    log_audit(db, admin.id, "unban", target_user_id=u.id)
    db.commit()
    await hub.send_to_user(u.id, {"type": "account_restored"})
    return {"ok": True}


@router.post("/users/{user_id}/toggle-premium")
async def toggle_premium(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404)
    u.is_premium = not u.is_premium
    u.premium_until = (datetime.utcnow() + timedelta(days=30)) if u.is_premium else None
    log_audit(db, admin.id, "toggle_premium", target_user_id=u.id, details=f"is_premium={u.is_premium}")
    db.commit()
    await hub.send_to_user(
        u.id,
        {"type": "plus_activated", "is_premium": u.is_premium, "premium_until": u.premium_until.isoformat() if u.premium_until else None},
    )
    return {"ok": True, "is_premium": u.is_premium}


@router.delete("/users/{user_id}/photos")
def admin_remove_user_photo(
    user_id: int,
    url: str = Query(...),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404)
    photos = [p for p in parse_list(u.photo_urls) if p != url]
    u.photo_urls = ",".join(photos)
    if not photos:
        u.profile_complete = False
    log_audit(db, admin.id, "remove_user_photo", target_user_id=u.id, details=url)
    db.commit()
    return {"ok": True, "photo_urls": photos}


@router.post("/users/{user_id}/force-logout")
async def force_logout_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404)
    u.token_version = (u.token_version or 1) + 1
    log_audit(db, admin.id, "force_logout", target_user_id=u.id)
    db.commit()
    await hub.send_to_user(u.id, {"type": "account_terminated"})
    return {"ok": True}


@router.post("/users/{user_id}/soft-delete")
async def admin_soft_delete_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404)
    if u.id == admin.id:
        raise HTTPException(400, "Cannot delete your own administrator account.")
    if not u.is_deleted:
        orig = u.original_email or u.email
        u.original_email = orig
        u.email = f"deleted_{u.id}_{int(time.time())}__{orig}"
        u.is_deleted = True
        u.is_active = False
        u.deleted_at = datetime.utcnow()
        u.deletion_reason = "Removed by administrator"
        u.token_version = (u.token_version or 1) + 1
        log_audit(db, admin.id, "admin_soft_delete", target_user_id=u.id, details=orig)
        db.commit()
        await hub.send_to_user(u.id, {"type": "account_terminated"})
    return {"ok": True}


@router.post("/users/{user_id}/restore")
def admin_restore_deleted_user(user_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id, User.is_deleted == True).first()
    if not u:
        raise HTTPException(404, "Deleted user record not found.")
    orig = (u.original_email or "").strip().lower()
    if not orig and "__" in u.email:
        orig = u.email.split("__", 1)[1]
    conflict = db.query(User).filter(User.email == orig, User.id != u.id).first() if orig else None
    if conflict:
        raise HTTPException(400, f"Cannot restore email {orig} because a newer account already registered with it.")
    if orig:
        u.email = orig
    u.is_deleted = False
    u.is_active = True
    u.snoozed = False
    u.deleted_at = None
    log_audit(db, admin.id, "restore_deleted_user", target_user_id=u.id, details=orig)
    db.commit()
    return {"ok": True}


class ReportActionIn(BaseModel):
    action: str  # resolve / dismiss / suspend_user / ban_temporary / ban_permanent
    admin_note: str = ""
    days: int = 7
    reason: str = ""


@router.get("/reports")
def list_reports(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    reps = db.query(Report).order_by(Report.resolved.asc(), Report.created_at.desc()).limit(150).all()
    out = []
    for r in reps:
        reported = db.query(User).filter(User.id == r.reported_id).first()
        reporter = db.query(User).filter(User.id == r.reporter_id).first()
        out.append({
            "id": r.id,
            "reason": r.reason,
            "details": r.details,
            "status": r.status or ("resolved" if r.resolved else "open"),
            "admin_note": r.admin_note or "",
            "resolved": bool(r.resolved),
            "created_at": r.created_at.isoformat() if r.created_at else "",
            "reported_user": {
                "id": reported.id,
                "name": reported.name or "",
                "email": reported.original_email or reported.email,
                "is_active": reported.is_active,
                "is_deleted": reported.is_deleted,
            } if reported else None,
            "reporter": {
                "id": reporter.id,
                "name": reporter.name or "",
                "email": reporter.original_email or reporter.email,
            } if reporter else None,
        })
    return out


@router.get("/reports/{report_id}/messages")
def get_reported_pair_messages(report_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rep = db.query(Report).filter(Report.id == report_id).first()
    if not rep:
        raise HTTPException(404)
    u1, u2 = min(rep.reporter_id, rep.reported_id), max(rep.reporter_id, rep.reported_id)
    m = db.query(Match).filter(Match.user1_id == u1, Match.user2_id == u2).first()
    if not m:
        return []
    msgs = db.query(Message).filter(Message.match_id == m.id).order_by(Message.created_at.asc()).limit(200).all()
    return [
        {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "content": msg.content,
            "created_at": msg.created_at.isoformat() if msg.created_at else "",
        }
        for msg in msgs
    ]


@router.post("/reports/{report_id}/action")
async def act_on_report(
    report_id: int,
    data: ReportActionIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    r = db.query(Report).filter(Report.id == report_id).first()
    if not r:
        raise HTTPException(404)
    r.resolved = True
    r.resolved_at = datetime.utcnow()
    r.admin_note = data.admin_note.strip()[:500]
    r.status = "dismissed" if data.action == "dismiss" else "resolved"

    if data.action in ("suspend_user", "ban_temporary", "ban_permanent"):
        target = db.query(User).filter(User.id == r.reported_id).first()
        if target and target.id != admin.id:
            if data.action == "ban_temporary":
                target.ban_type = "temporary"
                target.banned_until = datetime.utcnow() + timedelta(days=max(1, min(365, int(data.days or 7))))
            else:  # ban_permanent / legacy suspend_user
                target.ban_type = "permanent"
                target.banned_until = None
            target.ban_reason = (data.reason or f"Reported: {r.reason}")[:255]
            target.banned_at = datetime.utcnow()
            target.banned_by = admin.id
            target.is_active = False
            target.snoozed = True
            target.token_version = (target.token_version or 1) + 1
            await hub.send_to_user(target.id, {"type": "account_terminated"})

    log_audit(db, admin.id, f"report_{data.action}", target_user_id=r.reported_id, details=f"report #{r.id}")
    db.commit()
    return {"ok": True}


@router.post("/reports/{report_id}/resolve")
def resolve_report(report_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    r = db.query(Report).filter(Report.id == report_id).first()
    if not r:
        raise HTTPException(404)
    r.resolved = True
    r.status = "resolved"
    r.resolved_at = datetime.utcnow()
    log_audit(db, admin.id, "report_resolve", target_user_id=r.reported_id, details=f"report #{r.id}")
    db.commit()
    return {"ok": True}


@router.get("/moderation-logs")
def list_moderation_logs(
    rejected_only: bool = Query(False),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(ImageModerationLog)
    if rejected_only:
        q = q.filter(ImageModerationLog.accepted == False)
    rows = q.order_by(ImageModerationLog.created_at.desc()).limit(150).all()
    out = []
    for row in rows:
        u = db.query(User).filter(User.id == row.user_id).first()
        try:
            metrics = json.loads(row.metrics_json or "{}")
        except Exception:
            metrics = {}
        out.append({
            "id": row.id,
            "user_id": row.user_id,
            "user_email": (u.original_email or u.email) if u else "",
            "user_name": u.name if u else "",
            "filename": row.filename,
            "accepted": bool(row.accepted),
            "reject_code": row.reject_code,
            "reason": row.reason,
            "metrics": metrics,
            "stored_path": row.stored_path or "",
            "image_url": row.stored_path or "",
            "review_status": row.review_status or "auto",
            "review_note": row.review_note or "",
            "created_at": row.created_at.isoformat() if row.created_at else "",
        })
    return out


@router.get("/moderation/review")
def list_pending_reviews(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = (
        db.query(ImageModerationLog)
        .filter(ImageModerationLog.review_status == "pending", ImageModerationLog.stored_path != "")
        .order_by(ImageModerationLog.created_at.asc())
        .limit(200)
        .all()
    )
    out = []
    for row in rows:
        u = db.query(User).filter(User.id == row.user_id).first()
        try:
            metrics = json.loads(row.metrics_json or "{}")
        except Exception:
            metrics = {}
        out.append({
            "id": row.id,
            "user_id": row.user_id,
            "user_email": (u.original_email or u.email) if u else "",
            "user_name": u.name if u else "",
            "filename": row.filename,
            "reject_code": row.reject_code,
            "reason": row.reason,
            "metrics": metrics,
            "image_url": row.stored_path or "",
            "created_at": row.created_at.isoformat() if row.created_at else "",
        })
    return out


class ModerationReviewIn(BaseModel):
    note: str = ""


@router.post("/moderation/{log_id}/approve")
def approve_review(log_id: int, data: ModerationReviewIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.query(ImageModerationLog).filter(ImageModerationLog.id == log_id).first()
    if not row:
        raise HTTPException(404, "Review item not found.")
    if not row.stored_path:
        raise HTTPException(400, "No image copy is available to approve.")
    user = db.query(User).filter(User.id == row.user_id).first()
    if not user or user.is_deleted:
        raise HTTPException(400, "The owning student account no longer exists.")

    existing = parse_list(user.photo_urls)
    if len(existing) >= 6:
        row.review_status = "declined"
        row.review_note = (data.note or "Photo limit reached; could not approve.")[:255]
        row.reviewed_at = datetime.utcnow()
        row.reviewed_by = admin.id
        db.commit()
        raise HTTPException(400, "Student already has the maximum of 6 photos.")

    user.photo_urls = ",".join(existing + [row.stored_path])
    if user.name and user.course:
        user.profile_complete = True
    row.accepted = True
    row.review_status = "approved"
    row.review_note = data.note.strip()[:255]
    row.reviewed_at = datetime.utcnow()
    row.reviewed_by = admin.id
    log_audit(db, admin.id, "moderation_approve", target_user_id=user.id, details=f"photo #{row.id}")
    db.commit()
    return {"ok": True}


@router.post("/moderation/{log_id}/decline")
def decline_review(log_id: int, data: ModerationReviewIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.query(ImageModerationLog).filter(ImageModerationLog.id == log_id).first()
    if not row:
        raise HTTPException(404, "Review item not found.")
    row.accepted = False
    row.review_status = "declined"
    row.review_note = data.note.strip()[:255]
    row.reviewed_at = datetime.utcnow()
    row.reviewed_by = admin.id
    log_audit(db, admin.id, "moderation_decline", target_user_id=row.user_id, details=f"photo #{row.id}")
    db.commit()
    return {"ok": True}


@router.get("/payments")
def list_payments(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    pays = db.query(Payment).order_by(Payment.created_at.desc()).limit(150).all()
    out = []
    for p in pays:
        u = db.query(User).filter(User.id == p.user_id).first()
        out.append({
            "id": p.id,
            "user_id": p.user_id,
            "user_email": (u.original_email or u.email) if u else "",
            "user_name": u.name if u else "",
            "amount": p.amount,
            "currency": p.currency,
            "provider": p.provider,
            "reference": p.reference,
            "status": p.status,
            "description": p.description,
            "created_at": p.created_at.isoformat() if p.created_at else "",
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        })
    return out


@router.post("/payments/{payment_id}/approve")
async def manual_approve_payment(payment_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(404)
    if p.status != "success":
        p.status = "success"
        p.completed_at = datetime.utcnow()
        u = db.query(User).filter(User.id == p.user_id).first()
        if u:
            days = get_int_setting(db, "plus_duration_days", 30)
            u.is_premium = True
            u.premium_until = max(datetime.utcnow(), u.premium_until or datetime.utcnow()) + timedelta(days=days)
            await hub.send_to_user(u.id, {"type": "plus_activated", "is_premium": True})
        log_audit(db, admin.id, "manual_approve_payment", target_user_id=p.user_id, details=p.reference)
        db.commit()
    return {"ok": True}


@router.get("/audit-logs")
def list_audit_logs(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(150).all()
    out = []
    for r in rows:
        adm = db.query(User).filter(User.id == r.admin_id).first()
        out.append({
            "id": r.id,
            "admin_email": (adm.original_email or adm.email) if adm else "",
            "action": r.action,
            "target_user_id": r.target_user_id,
            "details": r.details,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        })
    return out


# ---------------------------------------------------------------------------
# EXPLORE ROOM MANAGEMENT
# ---------------------------------------------------------------------------

def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", (value or "").strip().lower()).strip("_")
    return slug[:48]


class ExploreRoomIn(BaseModel):
    title: str
    subtitle: str = ""
    tag: str = ""
    icon: str = "star"
    accent: str = "#FB7185"
    gradient: str = ""
    sort_order: int = 100
    is_active: bool = True
    slug: Optional[str] = None


@router.get("/explore-rooms")
def list_explore_rooms(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    counts = {slug: 0 for slug in active_slugs(db)}
    for u in db.query(User).filter(User.is_deleted == False, User.profile_complete == True).limit(5000).all():
        for slug in parse_list(u.explore_vibes):
            counts[slug] = counts.get(slug, 0) + 1
    opted = set()
    rooms = []
    for room in all_rooms(db):
        data = serialize_room(room, counts, opted)
        data["total_members"] = counts.get(room.slug, 0)
        rooms.append(data)
    return {"rooms": rooms, "icons": ICON_CHOICES}


def _clean_room_payload(data: ExploreRoomIn) -> dict:
    title = data.title.strip()
    if len(title) < 2:
        raise HTTPException(400, "Room name must be at least 2 characters.")
    accent = data.accent.strip() or "#FB7185"
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", accent):
        accent = "#FB7185"
    icon = data.icon if data.icon in ICON_CHOICES else "star"
    gradient = data.gradient.strip()[:220]
    if not gradient:
        gradient = f"linear-gradient(150deg, {accent} 0%, #0F1219 100%)"
    return {
        "title": title[:80],
        "subtitle": data.subtitle.strip()[:220],
        "tag": data.tag.strip()[:40],
        "icon": icon,
        "accent": accent,
        "gradient": gradient,
        "sort_order": max(0, min(9999, int(data.sort_order))),
        "is_active": bool(data.is_active),
    }


@router.post("/explore-rooms")
def create_explore_room(data: ExploreRoomIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    payload = _clean_room_payload(data)
    slug = _slugify(data.slug or payload["title"])
    if not slug:
        raise HTTPException(400, "Room link name could not be generated.")
    if db.query(ExploreRoom).filter(ExploreRoom.slug == slug).first():
        slug = f"{slug[:40]}_{uuid.uuid4().hex[:4]}"

    room = ExploreRoom(slug=slug, **payload)
    db.add(room)
    log_audit(db, admin.id, "create_explore_room", details=f"{slug} · {payload['title']}")
    db.commit()
    db.refresh(room)
    return {"ok": True, "room": serialize_room(room)}


@router.put("/explore-rooms/{room_id}")
def update_explore_room(
    room_id: int,
    data: ExploreRoomIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    room = db.query(ExploreRoom).filter(ExploreRoom.id == room_id).first()
    if not room:
        raise HTTPException(404, "Explore room not found.")
    payload = _clean_room_payload(data)
    for key, value in payload.items():
        setattr(room, key, value)
    log_audit(db, admin.id, "update_explore_room", details=f"{room.slug} · {room.title}")
    db.commit()
    db.refresh(room)
    return {"ok": True, "room": serialize_room(room)}


@router.delete("/explore-rooms/{room_id}")
def delete_explore_room(
    room_id: int,
    purge: bool = Query(False),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    room = db.query(ExploreRoom).filter(ExploreRoom.id == room_id).first()
    if not room:
        raise HTTPException(404, "Explore room not found.")

    members = 0
    for u in db.query(User).filter(User.is_deleted == False).limit(5000).all():
        if room.slug in parse_list(u.explore_vibes):
            members += 1
            if purge:
                remaining = [v for v in parse_list(u.explore_vibes) if v != room.slug]
                u.explore_vibes = ",".join(remaining)

    if members and not purge:
        room.is_active = False
        log_audit(db, admin.id, "hide_explore_room", details=f"{room.slug} · {members} members")
        db.commit()
        return {
            "ok": True,
            "archived": True,
            "message": f"Room hidden because {members} student(s) are still opted in. Their opt-ins are preserved.",
        }

    slug = room.slug
    db.delete(room)
    log_audit(db, admin.id, "delete_explore_room", details=slug)
    db.commit()
    return {"ok": True, "archived": False, "message": "Explore room deleted."}


# ---------------------------------------------------------------------------
# PUSH NOTIFICATIONS (TEXT + FLYER)
# ---------------------------------------------------------------------------

class NotificationIn(BaseModel):
    title: str
    body: str = ""
    flyer_url: str = ""
    audience: str = "all"
    target_school: str = ""
    target_user_id: Optional[int] = None
    expires_in_days: Optional[int] = 14
    is_active: bool = True


def _clean_notification_payload(data: NotificationIn) -> dict:
    title = data.title.strip()
    if len(title) < 2:
        raise HTTPException(400, "Notification title is required.")
    audience = data.audience if data.audience in ("all", "free", "plus", "new") else "all"
    flyer = data.flyer_url.strip()
    if flyer and not (flyer.startswith("/uploads/") or flyer.startswith("https://") or flyer.startswith("http://")):
        raise HTTPException(400, "Flyer image URL is invalid.")
    days = data.expires_in_days
    expires_at = None
    if days is not None and int(days) > 0:
        expires_at = datetime.utcnow() + timedelta(days=min(365, int(days)))
    return {
        "title": title[:140],
        "body": data.body.strip()[:4000],
        "flyer_url": flyer[:255],
        "audience": audience,
        "target_school": data.target_school.strip()[:100],
        "target_user_id": data.target_user_id,
        "expires_at": expires_at,
        "is_active": bool(data.is_active),
    }


@router.get("/notifications")
def list_notifications(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(Notification).order_by(Notification.created_at.desc()).limit(100).all()
    out = []
    for n in rows:
        reads = db.query(func.count(NotificationRead.id)).filter(NotificationRead.notification_id == n.id).scalar() or 0
        target = None
        if n.target_user_id:
            tu = db.query(User).filter(User.id == n.target_user_id).first()
            if tu:
                target = {"id": tu.id, "name": tu.name or "", "email": tu.original_email or tu.email}
        out.append({
            "id": n.id,
            "title": n.title,
            "body": n.body or "",
            "flyer_url": n.flyer_url or "",
            "audience": n.audience or "all",
            "target_school": n.target_school or "",
            "target_user": target,
            "is_active": bool(n.is_active),
            "read_count": reads,
            "created_at": n.created_at.isoformat() if n.created_at else "",
            "expires_at": n.expires_at.isoformat() if n.expires_at else None,
        })
    return out


@router.post("/notifications/flyer")
async def upload_notification_flyer(
    file: UploadFile = File(...),
    admin: User = Depends(require_admin),
):
    from PIL import Image
    import io

    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(413, "Flyer image must be smaller than 10 MB.")
    try:
        img = Image.open(io.BytesIO(raw))
        img = img.convert("RGB")
    except Exception:
        raise HTTPException(400, "Upload a valid JPG, PNG, or WebP flyer image.")

    img.thumbnail((1500, 1500), Image.LANCZOS)
    filename = f"flyer_{uuid.uuid4().hex[:12]}.webp"
    target = os.path.join(UPLOAD_DIR, filename)
    img.save(target, "WEBP", quality=88, method=6)
    return {
        "ok": True,
        "url": f"/uploads/{filename}",
        "width": img.width,
        "height": img.height,
        "bytes": os.path.getsize(target),
    }


@router.post("/notifications")
async def create_notification(data: NotificationIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    payload = _clean_notification_payload(data)
    if payload["target_user_id"]:
        target = db.query(User).filter(User.id == payload["target_user_id"]).first()
        if not target:
            raise HTTPException(404, "Target student account not found.")
    n = Notification(created_by=admin.id, **payload)
    db.add(n)
    log_audit(db, admin.id, "send_notification", target_user_id=payload["target_user_id"], details=payload["title"])
    db.commit()
    db.refresh(n)
    await hub.broadcast({"type": "notification_created", "notification_id": n.id})
    push.push_notification(db, n)
    return {"ok": True, "id": n.id}


class NotificationUpdateIn(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    flyer_url: Optional[str] = None
    audience: Optional[str] = None
    target_school: Optional[str] = None
    target_user_id: Optional[int] = None
    is_active: Optional[bool] = None
    expires_in_days: Optional[int] = None


@router.put("/notifications/{notification_id}")
async def update_notification(
    notification_id: int,
    data: NotificationUpdateIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(404, "Notification not found.")
    if data.title is not None:
        n.title = data.title.strip()[:140]
    if data.body is not None:
        n.body = data.body.strip()[:4000]
    if data.flyer_url is not None:
        n.flyer_url = data.flyer_url.strip()[:255]
    if data.audience is not None and data.audience in ("all", "free", "plus", "new"):
        n.audience = data.audience
    if data.target_school is not None:
        n.target_school = data.target_school.strip()[:100]
    if data.target_user_id is not None:
        n.target_user_id = data.target_user_id or None
    if data.is_active is not None:
        n.is_active = bool(data.is_active)
    if data.expires_in_days is not None:
        n.expires_at = (
            datetime.utcnow() + timedelta(days=min(365, int(data.expires_in_days)))
            if int(data.expires_in_days) > 0
            else None
        )
    log_audit(db, admin.id, "update_notification", details=n.title)
    db.commit()
    await hub.broadcast({"type": "notification_created", "notification_id": n.id})
    if n.is_active:
        push.push_notification(db, n)
    return {"ok": True}


@router.delete("/notifications/{notification_id}")
def delete_notification(notification_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(404, "Notification not found.")
    db.query(NotificationRead).filter(NotificationRead.notification_id == n.id).delete()
    db.delete(n)
    log_audit(db, admin.id, "delete_notification", details=n.title)
    db.commit()
    return {"ok": True}


class BulkDeleteNotificationsIn(BaseModel):
    mode: str = "expired"  # expired | inactive | all


@router.post("/notifications/delete-bulk")
def bulk_delete_notifications(data: BulkDeleteNotificationsIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    q = db.query(Notification)
    if data.mode == "expired":
        q = q.filter(Notification.expires_at.isnot(None), Notification.expires_at < now)
    elif data.mode == "inactive":
        q = q.filter(Notification.is_active == False)  # noqa: E712
    elif data.mode == "all":
        pass
    else:
        raise HTTPException(400, "Unknown deletion mode.")
    rows = q.all()
    ids = [n.id for n in rows]
    if ids:
        db.query(NotificationRead).filter(NotificationRead.notification_id.in_(ids)).delete(synchronize_session=False)
        for n in rows:
            db.delete(n)
        log_audit(db, admin.id, "delete_notifications_bulk", details=f"{data.mode} ({len(ids)})")
        db.commit()
    return {"ok": True, "deleted": len(ids)}


# ---------------------------------------------------------------------------
# PAYMENT GATEWAY (MOOLRE) CONFIGURATION
# ---------------------------------------------------------------------------

class PaymentGatewayIn(BaseModel):
    enabled: Optional[bool] = None
    environment: Optional[str] = None
    base_url: Optional[str] = None
    api_user: Optional[str] = None
    public_key: Optional[str] = None
    account_number: Optional[str] = None
    wallet_secret: Optional[str] = None
    merchant_email: Optional[str] = None
    callback_url: Optional[str] = None


def _mask(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "saved"
    return f"{value[:4]}...{value[-4:]}"


@router.get("/payment-gateway")
def get_payment_gateway(request: Request, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    from .payments import moolre_config

    cfg = moolre_config(db)
    origin = os.environ.get("PUBLIC_BASE_URL", str(request.base_url).rstrip("/"))
    return {
        "provider": "moolre",
        "enabled": cfg["enabled"],
        "configured": cfg["configured"],
        "environment": cfg["env"],
        "base_url": cfg["base_url"],
        "api_user": cfg["user"],
        "public_key_masked": _mask(cfg["pubkey"]),
        "public_key_set": bool(cfg["pubkey"]),
        "account_number": cfg["account_number"],
        "wallet_secret_masked": _mask(cfg["wallet_secret"]),
        "wallet_secret_set": bool(cfg["wallet_secret"]),
        "merchant_email": cfg["merchant_email"],
        "callback_url": cfg["callback_url"] or f"{origin}/api/payments/webhook",
        "webhook_url": f"{origin}/api/payments/webhook",
        "redirect_url": f"{origin}/api/payments/callback",
        "channels": ["MTN", "TELECEL", "AT"],
        "docs_url": "https://docs.moolre.com",
    }


@router.put("/payment-gateway")
def update_payment_gateway(
    data: PaymentGatewayIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    changes = []
    if data.enabled is not None:
        set_setting(db, "moolre_enabled", "true" if data.enabled else "false")
        changes.append(f"enabled={data.enabled}")
    if data.environment is not None:
        env = data.environment.strip().lower()
        env = env if env in ("live", "sandbox") else "live"
        set_setting(db, "moolre_env", env)
        changes.append(f"env={env}")
    if data.base_url is not None:
        set_setting(db, "moolre_base_url", data.base_url.strip()[:220])
        changes.append("base_url")
    if data.api_user is not None and data.api_user.strip():
        set_setting(db, "moolre_user", data.api_user.strip()[:160])
        changes.append("api_user")
    if data.public_key is not None and data.public_key.strip():
        set_setting(db, "moolre_pubkey", data.public_key.strip()[:255])
        changes.append("public_key")
    if data.account_number is not None:
        set_setting(db, "moolre_account_number", data.account_number.strip()[:60])
        changes.append("account_number")
    if data.wallet_secret is not None and data.wallet_secret.strip():
        set_setting(db, "moolre_wallet_secret", data.wallet_secret.strip()[:255])
        changes.append("wallet_secret")
    if data.merchant_email is not None:
        set_setting(db, "moolre_merchant_email", data.merchant_email.strip()[:200])
        changes.append("merchant_email")
    if data.callback_url is not None:
        set_setting(db, "moolre_callback_url", data.callback_url.strip()[:300])
        changes.append("callback_url")

    log_audit(db, admin.id, "update_payment_gateway", details=", ".join(changes))
    db.commit()
    return {"ok": True, "updated": changes}


@router.post("/payment-gateway/test")
async def test_payment_gateway(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    from .payments import moolre_config

    cfg = moolre_config(db)
    if not cfg["configured"]:
        return {
            "ok": False,
            "stage": "credentials",
            "message": "Add your Moolre API user, public key, and account number first.",
        }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(cfg["base_url"])
        return {
            "ok": True,
            "stage": "reachable",
            "status_code": r.status_code,
            "message": "Moolre endpoint is reachable and credentials are saved. Complete a small live payment to confirm the full flow.",
        }
    except Exception as exc:
        return {"ok": False, "stage": "network", "message": f"Could not reach Moolre: {exc}"}


# ---------------------------------------------------------------------------
# STORAGE, PERSISTENCE & BACKUPS
# ---------------------------------------------------------------------------

@router.get("/storage")
def storage_status(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    db_file = sqlite_file_path()
    db_bytes = os.path.getsize(db_file) if db_file and os.path.isfile(db_file) else 0
    data_dir_override = bool(os.environ.get("DATA_DIR") or os.environ.get("RENDER_DISK_PATH") or os.path.isdir("/var/data"))
    return {
        "engine": "sqlite" if IS_SQLITE else "postgresql",
        "database_file": db_file or "",
        "data_dir": DATA_DIR,
        "persistent_disk": data_dir_override and os.path.abspath(DATA_DIR) != os.path.abspath(BACKEND_ROOT),
        "database_bytes": db_bytes,
        "upload_dir": UPLOAD_DIR,
        "upload_files": count_files(UPLOAD_DIR),
        "upload_bytes": directory_size(UPLOAD_DIR),
        "backup_dir": BACKUP_DIR,
        "backups": list_backups(),
        "counts": {
            "users": db.query(User).count(),
            "swipes": db.query(Swipe).count(),
            "matches": db.query(Match).count(),
            "messages": db.query(Message).count(),
            "payments": db.query(Payment).count(),
            "reports": db.query(Report).count(),
        },
        "render_hint": (
            "Attach a Render persistent disk mounted at /var/data (or set DATA_DIR) so the SQLite database, uploads, and backups survive redeploys."
            if not data_dir_override
            else "Persistent storage is configured. Database, uploads, and backups are written to the durable disk."
        ),
    }


@router.post("/storage/backup")
def create_backup(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    result = backup_sqlite("admin")
    log_audit(db, admin.id, "create_backup", details=result.get("file", result.get("reason", "")))
    db.commit()
    return {"ok": bool(result.get("ok")), "result": result, "backups": list_backups()}


@router.get("/storage/download/{filename}")
def download_backup(filename: str, admin: User = Depends(require_admin)):
    safe = os.path.basename(filename)
    if not safe.startswith("campmatch-") or not safe.endswith(".db"):
        raise HTTPException(400, "Invalid backup file.")
    path = os.path.join(BACKUP_DIR, safe)
    if not os.path.isfile(path):
        raise HTTPException(404, "Backup file not found.")
    return FileResponse(path, filename=safe, media_type="application/octet-stream")


@router.get("/export")
def export_records(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Download a JSON export of every core table for off-platform archiving."""
    from fastapi.responses import JSONResponse

    def dt(value):
        return value.isoformat() if value else None

    users = db.query(User).all()
    payload = {
        "exported_at": datetime.utcnow().isoformat(),
        "users": [
            {
                "id": u.id,
                "email": u.original_email or u.email,
                "name": u.name,
                "school": u.school,
                "is_deleted": u.is_deleted,
                "created_at": dt(u.created_at),
            }
            for u in users
        ],
        "swipes": [
            {"id": s.id, "swiper_id": s.swiper_id, "swiped_id": s.swiped_id, "liked": s.liked, "created_at": dt(s.created_at)}
            for s in db.query(Swipe).limit(20000).all()
        ],
        "matches": [
            {"id": m.id, "user1_id": m.user1_id, "user2_id": m.user2_id, "created_at": dt(m.created_at), "is_active": m.is_active}
            for m in db.query(Match).limit(20000).all()
        ],
        "messages": [
            {"id": msg.id, "match_id": msg.match_id, "sender_id": msg.sender_id, "content": msg.content, "created_at": dt(msg.created_at)}
            for msg in db.query(Message).limit(50000).all()
        ],
        "payments": [
            {"id": p.id, "user_id": p.user_id, "amount": p.amount, "status": p.status, "reference": p.reference, "created_at": dt(p.created_at)}
            for p in db.query(Payment).limit(20000).all()
        ],
        "reports": [
            {"id": r.id, "reporter_id": r.reporter_id, "reported_id": r.reported_id, "reason": r.reason, "resolved": r.resolved}
            for r in db.query(Report).limit(20000).all()
        ],
    }
    log_audit(db, admin.id, "export_records")
    db.commit()
    return JSONResponse(payload, headers={"Content-Disposition": 'attachment; filename="campmatch-export.json"'})

