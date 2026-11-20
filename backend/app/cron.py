"""
Campmatch Cron Job Scheduler

Runs scheduled maintenance tasks using a background thread loop.
Tasks: daily backups, message retention purge, expired lockout cleanup,
webhook retry delivery, cache invalidation sweep.
"""

import time
import threading
from datetime import datetime, timedelta, timezone
from .database import SessionLocal, backup_sqlite
from .models import User
from .security import lift_expired_ban

# Task registry: name -> (callable, interval_seconds)
_tasks: list[tuple[str, callable, float]] = []
_running = False
_thread: threading.Thread | None = None


def register(name: str, interval_seconds: float):
    """Decorator to register a cron task."""

    def decorator(fn: callable):
        _tasks.append((name, fn, interval_seconds))
        return fn

    return decorator


def _run_loop():
    """Background thread: runs each registered task at its interval."""
    last_run: dict[str, float] = {}
    while _running:
        now = time.time()
        for name, fn, interval in _tasks:
            last = last_run.get(name, 0)
            if now - last >= interval:
                try:
                    fn()
                except Exception as exc:  # never kill the cron thread
                    print(f"[cron] task '{name}' failed: {exc}")
                last_run[name] = now
        time.sleep(10)


def start():
    global _running, _thread
    if _running:
        return
    _running = True
    _thread = threading.Thread(target=_run_loop, daemon=True, name="campmatch-cron")
    _thread.start()


def stop():
    global _running
    _running = False


# ---------------------------------------------------------------------------
# Registered cron tasks
# ---------------------------------------------------------------------------

@register("db_backup", 24 * 3600)  # every 24 hours
def _task_db_backup():
    try:
        result = backup_sqlite("cron-daily")
        if result.get("ok"):
            print(f"[cron] backup created: {result['file']}")
    except Exception as exc:
        print(f"[cron] backup failed: {exc}")


@register("message_retention", 3600)  # hourly
def _task_message_retention():
    try:
        from .main import purge_expired_messages

        purged = purge_expired_messages()
        if purged:
            print(f"[cron] purged {purged} expired messages")
    except Exception as exc:
        print(f"[cron] message retention failed: {exc}")


@register("lockout_cleanup", 1800)  # every 30 minutes
def _task_lockout_cleanup():
    """Auto-unlock accounts whose lockout window has expired."""
    try:
        now = datetime.now(timezone.utc)
        with SessionLocal() as db:
            locked = (
                db.query(User)
                .filter(User.locked_until.isnot(None), User.locked_until <= now)
                .all()
            )
            for u in locked:
                u.locked_until = None
                u.failed_login_attempts = 0
                u.locked_reason = ""
            if locked:
                db.commit()
                print(f"[cron] unlocked {len(locked)} accounts")
    except Exception as exc:
        print(f"[cron] lockout cleanup failed: {exc}")


@register("webhook_retry", 300)  # every 5 minutes
def _task_webhook_retry():
    try:
        from .webhooks import retry_failed_webhooks

        sent = retry_failed_webhooks()
        if sent:
            print(f"[cron] retried {sent} failed webhooks")
    except Exception as exc:
        print(f"[cron] webhook retry failed: {exc}")


@register("cache_invalidation", 600)  # every 10 minutes
def _task_cache_invalidation():
    try:
        from .cache import cache

        swept = cache.sweep_expired()
        if swept:
            print(f"[cron] cache swept {swept} expired entries")
    except Exception as exc:
        print(f"[cron] cache invalidation failed: {exc}")
