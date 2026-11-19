import os
import bcrypt
from datetime import datetime, timedelta
from jose import jwt
from sqlalchemy.orm import Session
from .models import User, Setting

SECRET = os.environ.get("SECRET_KEY")
if not SECRET:
    _is_prod = bool(os.environ.get("RENDER")) or os.environ.get("ENV", "").lower() == "production"
    if _is_prod:
        raise RuntimeError("SECRET_KEY must be set in Render environment variables.")
    # Local development only: a clearly non-production fallback.
    SECRET = "campmatch-dev-secret-change-me"
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
    "plus_price_3m": "60",
    "plus_price_12m": "200",
    "plus_discount_percent": "0",
    "plus_discount_enabled": "false",
    "free_daily_super_likes": "3",
    "plus_daily_super_likes": "10",
    "umat_only": "true",
    "allowed_domains": ",".join(DEFAULT_SCHOOL_DOMAINS.keys()),
    "signups_enabled": "true",
    "maintenance_mode": "false",
    "announcement_banner": "",
    "message_retention_days": "30",
    # Moolre payment gateway. Values entered in the admin console override the
    # matching Render environment variables, so keys can be rotated live.
    "moolre_enabled": "true",
    "moolre_env": "live",
    "moolre_base_url": "",
    "moolre_user": "",
    "moolre_pubkey": "",
    "moolre_account_number": "",
    "moolre_wallet_secret": "",
    "moolre_merchant_email": "",
    "moolre_callback_url": "",
    # Campmatch AI assistant. Any OpenAI-compatible provider works; defaults point at NVIDIA NIM.
    "ai_enabled": "true",
    "ai_api_key": "",
    "ai_model": "nvidia/llama-3.1-nemotron-70b-instruct",
    "ai_base_url": "https://integrate.api.nvidia.com/v1",
    # AI image moderation for profile photos (nudes, dark, no-person detection).
    "ai_image_moderation_enabled": "true",
    # AI admin worker: reviews reports & appeals 24/7 (temporary bans only).
    "ai_admin_enabled": "true",
    # New students must upload a photo before continuing (admin can loosen).
    "photo_required_for_signup": "true",
    # WhatsApp support link (blank hides the support buttons), e.g. https://wa.me/233241234567
    "whatsapp_link": "",
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


def lift_expired_ban(user: User) -> bool:
    """Auto-lift a temporary ban whose window has elapsed. Mutates the user
    object; the caller is responsible for committing."""
    if (
        user
        and not user.is_active
        and (user.ban_type or "") == "temporary"
        and user.banned_until is not None
        and user.banned_until < datetime.utcnow()
    ):
        user.is_active = True
        user.ban_type = ""
        user.banned_until = None
        user.ban_reason = ""
        return True
    return False


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


# Campmatch Plus subscription plans. "plus_price_ghs" is the 1-month price;
# the other tiers are priced separately so the admin can tune each.
PLUS_PLAN_DEFS = [
    {"id": "1m", "label": "1 Month", "months": 1, "days": 30, "price_key": "plus_price_ghs", "default_price": 25.0},
    {"id": "3m", "label": "3 Months", "months": 3, "days": 90, "price_key": "plus_price_3m", "default_price": 60.0},
    {"id": "12m", "label": "12 Months", "months": 12, "days": 365, "price_key": "plus_price_12m", "default_price": 200.0},
]


def get_plus_plans(db: Session) -> list:
    discount_enabled = get_bool_setting(db, "plus_discount_enabled", False)
    percent = get_float_setting(db, "plus_discount_percent", 0.0)
    plans = []
    for p in PLUS_PLAN_DEFS:
        base = get_float_setting(db, p["price_key"], p["default_price"])
        price = base
        if discount_enabled and percent > 0:
            price = round(base * (1.0 - percent / 100.0), 2)
        plans.append({
            "id": p["id"],
            "label": p["label"],
            "months": p["months"],
            "duration_days": p["days"],
            "base_price": round(base, 2),
            "price": price,
            "discounted": bool(price < base),
        })
    return plans


def resolve_plus_plan(db: Session, plan_id: str = "") -> dict:
    plans = get_plus_plans(db)
    for p in plans:
        if p["id"] == plan_id:
            return p
    return plans[0] if plans else {"id": "1m", "label": "1 Month", "duration_days": 30, "price": 25.0, "base_price": 25.0, "discounted": False}


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
