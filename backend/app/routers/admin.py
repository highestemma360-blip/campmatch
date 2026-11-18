import json
import time
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from ..database import get_db
from ..models import (
    User,
    Swipe,
    Match,
    Message,
    Payment,
    Report,
    ImageModerationLog,
    AdminAuditLog,
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
    action: str  # resolve / dismiss / suspend_user
    admin_note: str = ""


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

    if data.action == "suspend_user":
        target = db.query(User).filter(User.id == r.reported_id).first()
        if target and target.id != admin.id:
            target.is_active = False
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
            "created_at": row.created_at.isoformat() if row.created_at else "",
        })
    return out


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
