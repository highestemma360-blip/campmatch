import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

PERSISTENT_ROOT = "/var/data" if os.path.isdir("/var/data") else os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(PERSISTENT_ROOT, "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

raw_db_url = os.environ.get("DATABASE_URL", "")
if not raw_db_url:
    db_file = os.path.join(PERSISTENT_ROOT, "campmatch.db").replace("\\", "/")
    DB_PATH = f"sqlite:///{db_file}"
else:
    DB_PATH = raw_db_url

if DB_PATH.startswith("sqlite:///"):
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
            ("looking_for", "VARCHAR(60) DEFAULT 'Long-term partner'"),
            ("interests", "TEXT DEFAULT ''"),
            ("prompts", "TEXT DEFAULT '[]'"),
            ("opening_move", "VARCHAR(255) DEFAULT ''"),
            ("hall", "VARCHAR(100) DEFAULT ''"),
            ("zodiac", "VARCHAR(30) DEFAULT ''"),
            ("height", "VARCHAR(20) DEFAULT ''"),
            ("spotify_anthem", "VARCHAR(160) DEFAULT ''"),
            ("mode", "VARCHAR(20) DEFAULT 'date'"),
            ("max_distance_km", "INTEGER DEFAULT 50"),
            ("verified_only", "BOOLEAN DEFAULT 0"),
            ("boosted_until", "DATETIME"),
            ("last_active", "DATETIME"),
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
    }

    with engine.begin() as conn:
        for table_name, cols in migrations.items():
            if table_name not in existing_tables:
                continue
            existing_cols = {c["name"] for c in inspector.get_columns(table_name)}
            for col_name, col_def in cols:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_def}"))
