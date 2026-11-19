import os
import hmac
import secrets
import re
from datetime import datetime
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from google.oauth2 import id_token
from google.auth.transport import requests

from ..database import get_db
from ..models import User, LoginLog
from ..security import (
    hash_password,
    verify_password,
    create_token,
    detect_school,
    get_allowed_domains,
    get_bool_setting,
    get_setting,
    lift_expired_ban,
    DEFAULT_SCHOOL_DOMAINS,
)

router = APIRouter()
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip() or os.environ.get("VITE_GOOGLE_CLIENT_ID", "").strip()
DUMMY_BCRYPT_HASH = hash_password("campmatch-timing-guard-placeholder")


def _ban_error_message(user: User) -> str:
    if (user.ban_type or "") == "permanent":
        return "This account has been permanently banned for violating community guidelines."
    if (user.ban_type or "") == "temporary" and user.banned_until:
        return f"Your account is temporarily banned until {user.banned_until.strftime('%d %b %Y')}. Contact campus support for assistance."
    return "Your account has been suspended. Contact campus support for assistance."

BLOCKED_CONSUMER_DOMAINS = {
    "@gmail.com",
    "@googlemail.com",
    "@yahoo.com",
    "@outlook.com",
    "@hotmail.com",
    "@icloud.com",
    "@aol.com",
    "@proton.me",
    "@protonmail.com",
}


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return (request.client.host if request.client else "") or ""


def _lookup_location(ip: str) -> str:
    """Best-effort city/country from IP using a free public API. Never fails hard."""
    if not ip or ip in ("127.0.0.1", "::1", "localhost", ""):
        return "Localhost"
    try:
        with httpx.Client(timeout=httpx.Timeout(3.0, connect=1.5)) as client:
            r = client.get(f"http://ip-api.com/json/{ip}?fields=city,country,status")
            if r.status_code == 200:
                d = r.json()
                if d.get("status") == "success":
                    city = d.get("city") or ""
                    country = d.get("country") or ""
                    return ", ".join([x for x in (city, country) if x]) or "Unknown"
    except Exception:
        pass
    return "Unknown"


def _record_login_log(db: Session, request: Request, email: str, user_id: int | None = None):
    try:
        ip = _client_ip(request)
        db.add(
            LoginLog(
                user_id=user_id,
                email=(email or "").strip().lower(),
                ip_address=ip,
                location=_lookup_location(ip),
                user_agent=(request.headers.get("user-agent") or "")[:255],
            )
        )
        db.commit()
    except Exception:
        db.rollback()


class SignupIn(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthIn(BaseModel):
    credential: str = ""
    access_token: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class EmailCheckIn(BaseModel):
    email: EmailStr


class AdminLoginIn(BaseModel):
    username: str
    password: str


def is_school_email(email: str, db: Session) -> bool:
    clean = email.lower().strip()
    if any(clean.endswith(bad) for bad in BLOCKED_CONSUMER_DOMAINS):
        return False
    domains = get_allowed_domains(db)
    return any(clean.endswith(d) for d in domains)


def school_email_error_message(email: str, db: Session) -> str:
    clean = email.lower().strip()
    umat_only = get_bool_setting(db, "umat_only", True)
    if any(clean.endswith(bad) for bad in BLOCKED_CONSUMER_DOMAINS):
        return (
            "Personal Gmail and non-school accounts are not allowed. Use your official @st.umat.edu.gh Google account."
            if umat_only
            else "Personal Gmail and non-school accounts are not allowed. Use your official university (.edu.gh) account."
        )
    return (
        "Only verified @st.umat.edu.gh student accounts are currently accepted."
        if umat_only
        else "Only approved Ghana university student accounts (.edu.gh) are accepted."
    )


@router.get("/auth-config")
def auth_config(db: Session = Depends(get_db)):
    umat_only = get_bool_setting(db, "umat_only", True)
    domains = get_allowed_domains(db)
    schools = ["UMaT"] if umat_only else [DEFAULT_SCHOOL_DOMAINS.get(d, detect_school("x" + d)) for d in domains]
    return {
        "umat_only": umat_only,
        "domains": domains,
        "schools": schools,
        "google_client_id": GOOGLE_CLIENT_ID,
        "signups_enabled": get_bool_setting(db, "signups_enabled", True),
        "maintenance_mode": get_bool_setting(db, "maintenance_mode", False),
        "announcement_banner": get_setting(db, "announcement_banner", ""),
        "whatsapp_link": get_setting(db, "whatsapp_link", ""),
    }


@router.post("/email-check")
def check_student_email(data: EmailCheckIn, db: Session = Depends(get_db)):
    email_clean = data.email.lower().strip()
    if not is_school_email(email_clean, db):
        raise HTTPException(400, school_email_error_message(email_clean, db))

    existing = db.query(User).filter(User.email == email_clean, User.is_deleted == False).first()
    if not existing and not get_bool_setting(db, "signups_enabled", True):
        raise HTTPException(403, "New student registrations are temporarily paused.")
    return {"ok": True, "exists": existing is not None}


@router.post("/signup")
def signup(data: SignupIn, db: Session = Depends(get_db)):
    email_clean = data.email.lower().strip()
    if get_bool_setting(db, "maintenance_mode", False):
        raise HTTPException(503, "Platform is temporarily under maintenance. Please try again shortly.")
    if not get_bool_setting(db, "signups_enabled", True):
        raise HTTPException(403, "New registrations are temporarily paused by campus administrators.")
    if not is_school_email(email_clean, db):
        raise HTTPException(400, school_email_error_message(email_clean, db))
    if not data.password or len(data.password) < 8 or len(data.password) > 128:
        raise HTTPException(400, "Password must be between 8 and 128 characters.")

    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(400, "An account with this student email already exists.")

    user = User(
        email=email_clean,
        original_email=email_clean,
        password_hash=hash_password(data.password),
        school=detect_school(email_clean),
        last_active=datetime.utcnow(),
        is_admin=False,
        token_version=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "token": create_token(user.id, user.token_version or 1),
        "user_id": user.id,
        "profile_complete": False,
    }


@router.post("/login")
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
    email_clean = data.email.lower().strip()
    if not is_school_email(email_clean, db):
        raise HTTPException(400, school_email_error_message(email_clean, db))

    user = db.query(User).filter(User.email == email_clean, User.is_deleted == False).first()
    if not user:
        verify_password(data.password or "x", DUMMY_BCRYPT_HASH)
        raise HTTPException(401, "Invalid email or password.")
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password.")
    if get_bool_setting(db, "maintenance_mode", False):
        raise HTTPException(503, "Platform is currently in maintenance mode.")
    if lift_expired_ban(user):
        db.commit()
    if not user.is_active:
        raise HTTPException(403, _ban_error_message(user))

    if not user.school:
        user.school = detect_school(email_clean)
    user.last_active = datetime.utcnow()
    db.commit()
    _record_login_log(db, request, email_clean, user.id)
    return {
        "token": create_token(user.id, user.token_version or 1),
        "user_id": user.id,
        "profile_complete": bool(user.profile_complete),
    }


@router.post("/google")
async def google_login(data: GoogleAuthIn, request: Request, db: Session = Depends(get_db)):
    if get_bool_setting(db, "maintenance_mode", False):
        raise HTTPException(503, "Platform is currently in maintenance mode.")

    email = ""
    name = ""
    email_verified = False

    if data.credential:
        if not GOOGLE_CLIENT_ID:
            raise HTTPException(400, "Google sign-in client ID is not configured on this server.")
        try:
            idinfo = id_token.verify_oauth2_token(data.credential, requests.Request(), GOOGLE_CLIENT_ID)
            email = (idinfo.get("email") or "").lower().strip()
            name = (idinfo.get("name") or "").strip()
            email_verified = bool(idinfo.get("email_verified"))
        except ValueError:
            raise HTTPException(401, "Invalid Google authentication token.")
    elif data.access_token:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {data.access_token}"},
            )
        if r.status_code != 200:
            raise HTTPException(401, "Unable to verify Google account.")
        uinfo = r.json()
        email = (uinfo.get("email") or "").lower().strip()
        name = (uinfo.get("name") or "").strip()
        email_verified = bool(uinfo.get("email_verified"))
    else:
        raise HTTPException(400, "Missing Google credentials.")

    if not email or not email_verified:
        raise HTTPException(400, "Your Google account email could not be verified.")

    # Strictly block @gmail.com and any non-approved school Google domain
    if not is_school_email(email, db):
        raise HTTPException(403, school_email_error_message(email, db))

    user = db.query(User).filter(User.email == email, User.is_deleted == False).first()
    if not user:
        if not get_bool_setting(db, "signups_enabled", True):
            raise HTTPException(403, "New registrations are temporarily paused.")
        clean_name = re.sub(r"<[^>]*>", "", (name or "")).strip()[:100]
        user = User(
            email=email,
            original_email=email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            name=clean_name,
            school=detect_school(email),
            last_active=datetime.utcnow(),
            is_admin=False,
            token_version=1,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if lift_expired_ban(user):
            db.commit()
        if not user.is_active:
            raise HTTPException(403, _ban_error_message(user))
        if not user.school:
            user.school = detect_school(email)
        user.last_active = datetime.utcnow()
        db.commit()

    _record_login_log(db, request, email, user.id)
    return {
        "token": create_token(user.id, user.token_version or 1),
        "user_id": user.id,
        "profile_complete": bool(user.profile_complete),
    }


@router.post("/admin-auth/login")
def admin_portal_login(data: AdminLoginIn, request: Request, db: Session = Depends(get_db)):
    """
    Dedicated /admin portal authentication verified strictly against Render environment
    variables (ADMIN_USERNAME / ADMIN_EMAIL and ADMIN_PASSWORD) or promoted admin accounts.
    """
    env_ident = (os.environ.get("ADMIN_USERNAME") or os.environ.get("ADMIN_EMAIL") or "").strip().lower()
    env_pw = (os.environ.get("ADMIN_PASSWORD") or "").strip()

    submitted_ident = (data.username or "").strip().lower()
    submitted_pw = data.password or ""

    if not submitted_ident or not submitted_pw:
        raise HTTPException(400, "Enter administrator username/email and password.")

    if env_ident and env_pw:
        ident_ok = hmac.compare_digest(submitted_ident, env_ident)
        pw_ok = hmac.compare_digest(submitted_pw, env_pw)
        if ident_ok and pw_ok:
            # Ensure backing admin row exists in DB for audit logs & token verification
            admin_email = env_ident if "@" in env_ident else f"{env_ident}@admin.campmatch.local"
            admin_user = db.query(User).filter(User.email == admin_email).first()
            if not admin_user:
                admin_user = User(
                    email=admin_email,
                    original_email=admin_email,
                    password_hash=hash_password(env_pw),
                    name="Administrator",
                    school="Admin",
                    is_admin=True,
                    is_active=True,
                    is_deleted=False,
                    snoozed=True,  # Keep admin utility account out of student swipe decks
                    token_version=1,
                )
                db.add(admin_user)
                db.commit()
                db.refresh(admin_user)
            else:
                admin_user.is_admin = True
                admin_user.is_active = True
                admin_user.is_deleted = False
                admin_user.last_active = datetime.utcnow()
                db.commit()

            _record_login_log(db, request, admin_email, admin_user.id)
            return {
                "token": create_token(admin_user.id, admin_user.token_version or 1),
                "admin": {
                    "id": admin_user.id,
                    "email": admin_user.email,
                    "name": admin_user.name or "Administrator",
                },
            }

    # Secondary check: explicitly promoted is_admin DB account
    db_admin = db.query(User).filter(
        User.email == submitted_ident,
        User.is_admin == True,
        User.is_deleted == False,
        User.is_active == True,
    ).first()
    if db_admin and verify_password(submitted_pw, db_admin.password_hash):
        db_admin.last_active = datetime.utcnow()
        db.commit()
        _record_login_log(db, request, db_admin.email, db_admin.id)
        return {
            "token": create_token(db_admin.id, db_admin.token_version or 1),
            "admin": {
                "id": db_admin.id,
                "email": db_admin.email,
                "name": db_admin.name or "Administrator",
            },
        }

    verify_password(submitted_pw, DUMMY_BCRYPT_HASH)
    raise HTTPException(401, "Invalid administrator credentials.")
