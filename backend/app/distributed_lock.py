"""
Campmatch Distributed Locks

File-based distributed locks for single-node deployments, with a Redis-compatible
interface that can be swapped in for multi-node / Kubernetes deployments.
Used to prevent race conditions on critical sections (payment processing,
account lockout updates, boost activation).
"""

import os
import time
import threading
from datetime import datetime, timezone
from typing import Any
from contextlib import contextmanager
from dataclasses import dataclass

LOCK_DIR = os.environ.get("CAMP_LOCK_DIR", "/tmp/campmatch-locks")
try:
    os.makedirs(LOCK_DIR, exist_ok=True)
except Exception:
    LOCK_DIR = "/tmp"


@dataclass
class DistributedLock:
    name: str
    timeout_seconds: float = 30.0
    poll_interval: float = 0.05

    _lock: threading.Lock = None
    _fh: Any = None

    def __post_init__(self):
        self._lock = threading.Lock()
        self._fh = None

    def _path(self) -> str:
        safe = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in self.name)
        return os.path.join(LOCK_DIR, f"lock-{safe}.lock")

    def acquire(self) -> bool:
        """Blocking acquire with timeout. Returns True if lock obtained."""
        path = self._path()
        deadline = time.time() + self.timeout_seconds
        while True:
            try:
                # O_CREAT | O_EXCL = atomic create-if-not-exists
                self._fh = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(self._fh, str(os.getpid()).encode())
                return True
            except FileExistsError:
                if time.time() >= deadline:
                    return False
                time.sleep(self.poll_interval)
            except Exception:
                return False

    def release(self):
        if self._fh is not None:
            try:
                os.close(self._fh)
            except Exception:
                pass
            try:
                os.unlink(self._path())
            except Exception:
                pass
            self._fh = None

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, *exc):
        self.release()


@contextmanager
def distributed_lock(name: str, timeout_seconds: float = 30.0):
    lock = DistributedLock(name, timeout_seconds=timeout_seconds)
    acquired = lock.acquire()
    try:
        yield acquired
    finally:
        if acquired:
            lock.release()
