import os
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from google.oauth2 import id_token
from google.auth.transport import requests

from ..database import get_db
from ..models import User
from ..security import (
    hash_password,
    verify_password,
    create_token,
    detect_school,
    get_allowed_domains,
    get_bool_setting,
    get_setting,
    DEFAULT_SCHOOL_DOMAINS,
)

router = APIRouter()
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip().lower()


class SignupIn(BaseModel):
    email: EmailStr
    password: str


class GoogleTokenIn(BaseModel):
    credential: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


def is_allowed_email(email: str, db: Session) -> bool:
    clean = email.lower().strip()
    if ADMIN_EMAIL and clean == ADMIN_EMAIL:
        return True
    domains = get_allowed_domains(db)
    return any(clean.endswith(d) for d in domains)


@router.get("/auth-config")
def auth_config(db: Session = Depends(get_db)):
    umat_only = get_bool_setting(db, "umat_only", True)
    domains = get_allowed_domains(db)
    schools = ["UMaT"] if umat_only else [DEFAULT_SCHOOL_DOMAINS.get(d, detect_school("x" + d)) for d in domains]
    return {
        "umat_only": umat_only,
        "domains": domains,
        "schools": schools,
        "signups_enabled": get_bool_setting(db, "signups_enabled", True),
        "maintenance_mode": get_bool_setting(db, "maintenance_mode", False),
        "announcement_banner": get_setting(db, "announcement_banner", ""),
    }


DUMMY_BCRYPT_HASH = hash_password("campmatch-timing-guard-placeholder")


@router.post("/signup")
def signup(data: SignupIn, db: Session = Depends(get_db)):
    email_clean = data.email.lower().strip()
    is_env_admin = bool(ADMIN_EMAIL and email_clean == ADMIN_EMAIL)

    if get_bool_setting(db, "maintenance_mode", False) and not is_env_admin:
        raise HTTPException(503, "Platform is temporarily under maintenance. Please try again shortly.")
    if not get_bool_setting(db, "signups_enabled", True) and not is_env_admin:
        raise HTTPException(403, "New registrations are temporarily paused by campus administrators.")
    if not is_allowed_email(email_clean, db):
        umat_only = get_bool_setting(db, "umat_only", True)
        msg = (
            "Only verified @st.umat.edu.gh student emails are currently accepted."
            if umat_only
            else "Please use an approved Ghana university student email (.edu.gh)."
        )
        raise HTTPException(400, msg)
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
        is_admin=is_env_admin,
        token_version=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {
        "token": create_token(user.id, user.token_version or 1),
        "user_id": user.id,
        "profile_complete": False,
        "is_admin": user.is_admin,
    }


@router.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    email_clean = data.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean, User.is_deleted == False).first()
    if not user:
        verify_password(data.password or "x", DUMMY_BCRYPT_HASH)
        raise HTTPException(401, "Invalid email or password.")
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password.")
    if get_bool_setting(db, "maintenance_mode", False) and not user.is_admin:
        raise HTTPException(503, "Platform is currently in maintenance mode.")
    if not user.is_active:
        raise HTTPException(403, "Your account has been suspended. Contact campus support for assistance.")
    if not is_allowed_email(email_clean, db) and not user.is_admin:
        raise HTTPException(403, "Your email domain is not currently permitted.")

    if not user.school:
        user.school = detect_school(email_clean)
    user.last_active = datetime.utcnow()
    db.commit()
    return {
        "token": create_token(user.id, user.token_version or 1),
        "user_id": user.id,
        "profile_complete": bool(user.profile_complete),
        "is_admin": bool(user.is_admin),
    }


@router.post("/google")
def google_login(data: GoogleTokenIn, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(400, "Google sign-in is not configured on this server.")
    try:
        idinfo = id_token.verify_oauth2_token(data.credential, requests.Request(), GOOGLE_CLIENT_ID)
        email = (idinfo.get("email") or "").lower().strip()
        name = (idinfo.get("name") or "").strip()
        if not email or not is_allowed_email(email, db):
            raise HTTPException(400, "Only approved university student emails are accepted.")

        user = db.query(User).filter(User.email == email, User.is_deleted == False).first()
        if not user:
            if not get_bool_setting(db, "signups_enabled", True):
                raise HTTPException(403, "New registrations are temporarily paused.")
            user = User(
                email=email,
                original_email=email,
                password_hash=hash_password(secrets.token_urlsafe(32)),
                name=name,
                school=detect_school(email),
                last_active=datetime.utcnow(),
                is_admin=bool(ADMIN_EMAIL and email == ADMIN_EMAIL),
                token_version=1,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if not user.is_active:
                raise HTTPException(403, "Your account has been suspended.")
            if get_bool_setting(db, "maintenance_mode", False) and not user.is_admin:
                raise HTTPException(503, "Platform is currently in maintenance mode.")
            if not user.school:
                user.school = detect_school(email)
            user.last_active = datetime.utcnow()
            db.commit()

        return {
            "token": create_token(user.id, user.token_version or 1),
            "user_id": user.id,
            "profile_complete": bool(user.profile_complete),
            "is_admin": bool(user.is_admin),
        }
    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(401, "Invalid Google authentication token.")
