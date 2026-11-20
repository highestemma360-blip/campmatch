import os
import shutil
import glob
from datetime import datetime
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _resolve_data_dir() -> str:
    """Pick a durable data directory.

    Priority:
      1. DATA_DIR environment variable (explicit override).
      2. Render persistent disk path (RENDER_DISK_PATH or the conventional /var/data).
      3. The backend folder for local development.
    """
    explicit = os.environ.get("DATA_DIR", "").strip()
    if explicit:
        return os.path.abspath(explicit)

    render_disk = os.environ.get("RENDER_DISK_PATH", "").strip()
    if render_disk and os.path.isdir(render_disk):
        return os.path.abspath(render_disk)

    if os.path.isdir("/var/data"):
        return "/var/data"

    return BACKEND_ROOT


DATA_DIR = _resolve_data_dir()
PERSISTENT_ROOT = DATA_DIR
BACKUP_DIR = os.path.join(DATA_DIR, "backups")
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(DATA_DIR, "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

raw_db_url = os.environ.get("DATABASE_URL", "").strip()
if not raw_db_url:
    db_file = os.path.join(DATA_DIR, "campmatch.db").replace("\\", "/")
    DB_PATH = f"sqlite:///{db_file}"
else:
    DB_PATH = raw_db_url

# Make sure the folder that will hold a SQLite file exists (common Render pitfall).
if DB_PATH.startswith("sqlite:///"):
    _sqlite_file = DB_PATH[len("sqlite:///"):]
    if _sqlite_file and _sqlite_file != ":memory:":
        _sqlite_dir = os.path.dirname(os.path.abspath(_sqlite_file))
        if _sqlite_dir:
            os.makedirs(_sqlite_dir, exist_ok=True)

IS_SQLITE = DB_PATH.startswith("sqlite:///")

if IS_SQLITE:
    engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DB_PATH, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def sqlite_file_path() -> str | None:
    if not IS_SQLITE:
        return None
    path = engine.url.database
    if not path or path == ":memory:":
        return None
    return os.path.abspath(path)


def directory_size(path: str) -> int:
    total = 0
    if not os.path.isdir(path):
        return 0
    for dirpath, _dirnames, filenames in os.walk(path):
        for name in filenames:
            try:
                total += os.path.getsize(os.path.join(dirpath, name))
            except OSError:
                continue
    return total


def count_files(path: str) -> int:
    if not os.path.isdir(path):
        return 0
    return sum(len(files) for _dirpath, _dirnames, files in os.walk(path))


def backup_sqlite(reason: str = "manual", keep: int = 12) -> dict:
    """Create a timestamped copy of the SQLite database and prune old copies.

    Returns metadata for the admin storage panel. Never raises: a failed backup
    must not prevent the API from starting.
    """
    path = sqlite_file_path()
    if not path or not os.path.isfile(path):
        return {"ok": False, "reason": "Database is not a local SQLite file."}

    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        stamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        safe_reason = "".join(ch for ch in reason if ch.isalnum() or ch in ("-", "_"))[:24] or "manual"
        target = os.path.join(BACKUP_DIR, f"campmatch-{stamp}-{safe_reason}.db")
        shutil.copy2(path, target)

        backups = sorted(glob.glob(os.path.join(BACKUP_DIR, "campmatch-*.db")), key=os.path.getmtime, reverse=True)
        for old in backups[keep:]:
            try:
                os.remove(old)
            except OSError:
                pass

        return {
            "ok": True,
            "file": os.path.basename(target),
            "bytes": os.path.getsize(target),
            "created_at": datetime.utcnow().isoformat(),
        }
    except Exception as exc:  # pragma: no cover - defensive
        return {"ok": False, "reason": str(exc)}


def list_backups() -> list[dict]:
    items = []
    for path in sorted(glob.glob(os.path.join(BACKUP_DIR, "campmatch-*.db")), key=os.path.getmtime, reverse=True):
        try:
            stat = os.stat(path)
        except OSError:
            continue
        items.append(
            {
                "file": os.path.basename(path),
                "bytes": stat.st_size,
                "created_at": datetime.utcfromtimestamp(stat.st_mtime).isoformat(),
            }
        )
    return items


def run_migrations():
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    migrations = {
        "users": [
            ("original_email", "VARCHAR(255) DEFAULT ''"),
            ("is_deleted", "BOOLEAN DEFAULT 0"),
            ("deleted_at", "DATETIME"),
            ("deletion_reason", "VARCHAR(255) DEFAULT ''"),
            ("snoozed", "BOOLEAN DEFAULT 0"),
            ("token_version", "INTEGER DEFAULT 1"),
            ("failed_login_attempts", "INTEGER DEFAULT 0"),
            ("locked_until", "DATETIME"),
            ("locked_reason", "VARCHAR(255) DEFAULT ''"),
            ("looking_for", "VARCHAR(60) DEFAULT 'Long-term partner'"),
            ("interests", "TEXT DEFAULT ''"),
            ("prompts", "TEXT DEFAULT '[]'"),
            ("opening_move", "VARCHAR(255) DEFAULT ''"),
            ("hall", "VARCHAR(100) DEFAULT ''"),
            ("zodiac", "VARCHAR(30) DEFAULT ''"),
            ("height", "VARCHAR(20) DEFAULT ''"),
            ("spotify_anthem", "VARCHAR(160) DEFAULT ''"),
            ("explore_vibes", "TEXT DEFAULT ''"),
            ("mode", "VARCHAR(20) DEFAULT 'date'"),
            ("max_distance_km", "INTEGER DEFAULT 50"),
            ("verified_only", "BOOLEAN DEFAULT 0"),
            ("boosted_until", "DATETIME"),
            ("last_active", "DATETIME"),
            ("ban_type", "VARCHAR(20) DEFAULT ''"),
            ("banned_until", "DATETIME"),
            ("ban_reason", "VARCHAR(255) DEFAULT ''"),
            ("banned_at", "DATETIME"),
            ("banned_by", "INTEGER"),
            ("photo_required", "BOOLEAN DEFAULT 1"),
            ("photo_approved_at", "DATETIME"),
        ],
        "image_moderation_logs": [
            ("stored_path", "VARCHAR(255) DEFAULT ''"),
            ("review_status", "VARCHAR(20) DEFAULT 'auto'"),
            ("reviewed_at", "DATETIME"),
            ("reviewed_by", "INTEGER"),
            ("review_note", "VARCHAR(255) DEFAULT ''"),
        ],
        "matches": [
            ("expires_at", "DATETIME"),
            ("extended", "BOOLEAN DEFAULT 0"),
            ("is_super", "BOOLEAN DEFAULT 0"),
            ("is_active", "BOOLEAN DEFAULT 1"),
            ("unmatched_by", "INTEGER"),
            ("unmatched_at", "DATETIME"),
        ],
        "messages": [
            ("reaction", "VARCHAR(16) DEFAULT ''"),
            ("is_deleted", "BOOLEAN DEFAULT 0"),
        ],
        "reports": [
            ("status", "VARCHAR(20) DEFAULT 'open'"),
            ("admin_note", "TEXT DEFAULT ''"),
            ("resolved_at", "DATETIME"),
        ],
        "payments": [
            ("duration_days", "INTEGER DEFAULT 30"),
        ],
        "login_logs": [
            ("id", "INTEGER PRIMARY KEY AUTOINCREMENT"),
            ("user_id", "INTEGER"),
            ("email", "VARCHAR(255) DEFAULT ''"),
            ("ip_address", "VARCHAR(64) DEFAULT ''"),
            ("location", "VARCHAR(120) DEFAULT ''"),
            ("user_agent", "VARCHAR(255) DEFAULT ''"),
            ("logged_at", "DATETIME"),
        ],
    }

    with engine.begin() as conn:
        for table_name, cols in migrations.items():
            if table_name not in existing_tables:
                continue
            existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
            for col_name, col_def in cols:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_def}"))

        # Ensure performance indexes exist on hot query columns
        index_defs = {
            "users": [
                ("idx_users_email_active", "email", "is_active"),
                ("idx_users_locked_until", "locked_until"),
                ("idx_users_failed_attempts", "failed_login_attempts"),
            ],
            "login_logs": [
                ("idx_login_logs_email", "email"),
                ("idx_login_logs_ip", "ip_address"),
                ("idx_login_logs_logged_at", "logged_at"),
            ],
            "swipes": [
                ("idx_swipes_swiper_created", "swiper_id", "created_at"),
            ],
            "matches": [
                ("idx_matches_user1_active", "user1_id", "is_active"),
                ("idx_matches_user2_active", "user2_id", "is_active"),
            ],
            "messages": [
                ("idx_messages_match_created", "match_id", "created_at"),
            ],
            "payments": [
                ("idx_payments_reference", "reference"),
                ("idx_payments_user_status", "user_id", "status"),
            ],
            "webhook_events": [
                ("idx_webhook_events_type", "event_type"),
                ("idx_webhook_events_created", "created_at"),
            ],
        }

        for table_name, idx_list in index_defs.items():
            if table_name not in existing_tables:
                continue
            existing_idx_names = {ix["name"] for ix in inspector.get_indexes(table_name)}
            for idx_name, *cols in idx_list:
                if idx_name in existing_idx_names:
                    continue
                col_list = ", ".join(cols)
                try:
                    conn.execute(
                        text(f'CREATE INDEX IF NOT EXISTS "{idx_name}" ON {table_name} ({col_list})')
                    )
                except Exception:
                    pass  # SQLite may not support IF NOT EXISTS on CREATE INDEX in older versions
