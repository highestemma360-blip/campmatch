"""
Campmatch Feature Flags

Runtime feature flag system backed by the database `settings` table.
Flags are checked with `is_enabled(flag_name)` and can be toggled
from the admin panel or via environment variables at startup.
"""

from .database import SessionLocal
from .security import get_bool_setting, get_setting


def is_enabled(flag_name: str, db=None) -> bool:
    """Check if a feature flag is enabled."""
    own_session = False
    if db is None:
        db = SessionLocal()
        own_session = True
    try:
        # Environment variable override: CAMP_FLAG_<NAME>=true|false
        import os

        env_val = os.environ.get(f"CAMP_FLAG_{flag_name.upper()}")
        if env_val is not None:
            return env_val.lower() == "true"

        val = get_setting(db, f"flag_{flag_name}", "false")
        return val.lower() == "true"
    finally:
        if own_session:
            db.close()


def set_flag(flag_name: str, enabled: bool, db):
    """Set a feature flag value in the database."""
    from .security import set_setting

    set_setting(db, f"flag_{flag_name}", "true" if enabled else "false")


# Default flags
DEFAULT_FLAGS = {
    "new_swipe_ui": True,
    "spotlight_boost": True,
    "ai_profile_assist": True,
    "webhook_delivery": False,
    "canary_payments": False,
    "pwa_install_prompt": True,
}
