import os
import bcrypt
from datetime import datetime, timedelta
from jose import jwt
from sqlalchemy.orm import Session
from .models import User, Setting

SECRET = os.environ.get("SECRET_KEY", "campmatch-secret-change-me")
ALGORITHM = "HS256"

DEFAULT_SCHOOL_DOMAINS = {
    "@st.umat.edu.gh": "UMaT",
    "@st.ug.edu.gh": "UG Legon",
    "@st.knust.edu.gh": "KNUST",
    "@st.uew.edu.gh": "UEW",
    "@st.ucc.edu.gh": "UCC",
    "@st.uds.edu.gh": "UDS",
    "@st.upsa.edu.gh": "UPSA",
    "@st.uhas.edu.gh": "UHAS",
    "@st.uenr.edu.gh": "UENR",
    "@st.gimpa.edu.gh": "GIMPA",
    "@st.gctu.edu.gh": "GCTU",
    "@st.aamusted.edu.gh": "AAMUSTED",
    "@st.cktutas.edu.gh": "CKT-UTAS",
    "@st.sddubids.edu.gh": "SDD-UBIDS",
    "@st.uesd.edu.gh": "UESD",
}

DEFAULT_SETTINGS = {
    "plus_enabled": "false",
    "free_daily_swipe_limit": "10",
    "plus_price_ghs": "25",
    "plus_duration_days": "30",
    "free_daily_super_likes": "3",
    "plus_daily_super_likes": "10",
    "umat_only": "true",
    "allowed_domains": ",".join(DEFAULT_SCHOOL_DOMAINS.keys()),
    "signups_enabled": "true",
    "maintenance_mode": "false",
    "announcement_banner": "",
}


def hash_password(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt(rounds=10)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    if not password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: int, token_version: int = 1) -> str:
    payload = {
        "sub": str(user_id),
        "ver": token_version,
        "exp": datetime.utcnow() + timedelta(days=30),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET, algorithms=[ALGORITHM])


def get_setting(db: Session, key: str, default: str = "") -> str:
    row = db.query(Setting).filter(Setting.key == key).first()
    if row and row.value is not None:
        return row.value
    return DEFAULT_SETTINGS.get(key, default)


def get_bool_setting(db: Session, key: str, default: bool = False) -> bool:
    val = get_setting(db, key, "true" if default else "false")
    return val.lower() == "true"


def get_int_setting(db: Session, key: str, default: int = 10) -> int:
    val = get_setting(db, key, str(default))
    try:
        return int(float(val))
    except Exception:
        return default


def get_float_setting(db: Session, key: str, default: float = 25.0) -> float:
    val = get_setting(db, key, str(default))
    try:
        return float(val)
    except Exception:
        return default


def set_setting(db: Session, key: str, value: str):
    row = db.query(Setting).filter(Setting.key == key).first()
    if not row:
        row = Setting(key=key, value=str(value))
        db.add(row)
    else:
        row.value = str(value)
    db.commit()
    return row


def detect_school(email: str) -> str:
    clean = (email or "").lower().strip()
    for domain, school in DEFAULT_SCHOOL_DOMAINS.items():
        if clean.endswith(domain):
            return school
    if "@" in clean:
        host = clean.split("@", 1)[1]
        parts = [p for p in host.split(".") if p not in ("st", "edu", "gh", "ac")]
        if parts:
            return parts[0].upper()
    return "Campus"


def get_allowed_domains(db: Session) -> list[str]:
    if get_bool_setting(db, "umat_only", True):
        return ["@st.umat.edu.gh"]
    raw = get_setting(db, "allowed_domains", ",".join(DEFAULT_SCHOOL_DOMAINS.keys()))
    domains = []
    for d in raw.split(","):
        d = d.strip().lower()
        if not d:
            continue
        if not d.startswith("@"):
            d = "@" + d
        domains.append(d)
    return domains or list(DEFAULT_SCHOOL_DOMAINS.keys())


def bootstrap_defaults(db: Session):
    for key, val in DEFAULT_SETTINGS.items():
        exists = db.query(Setting).filter(Setting.key == key).first()
        if not exists:
            db.add(Setting(key=key, value=val))
    db.commit()

    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "").strip()
    if admin_email:
        existing = db.query(User).filter(User.email == admin_email).first()
        if not existing and len(admin_password) >= 8:
            admin = User(
                email=admin_email,
                original_email=admin_email,
                password_hash=hash_password(admin_password),
                name="Campus Admin",
                school=detect_school(admin_email),
                is_admin=True,
                is_active=True,
                is_premium=True,
            )
            db.add(admin)
            db.commit()
        elif existing and not existing.is_admin:
            existing.is_admin = True
            db.commit()
