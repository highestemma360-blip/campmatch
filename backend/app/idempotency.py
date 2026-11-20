"""
Campmatch Idempotency Keys

Prevents duplicate processing of payment, webhook, and state-changing requests.
Clients send an `Idempotency-Key` header; the server caches the response for
a configurable window and returns the cached result on replay.
"""

import time
import threading
from dataclasses import dataclass, field
from typing import Any


@dataclass
class IdempotencyEntry:
    key: str
    response: Any
    status_code: int
    created_at: float
    ttl_seconds: float = 86400  # 24 hours


class IdempotencyStore:
    def __init__(self, default_ttl: float = 86400):
        self._entries: dict[str, IdempotencyEntry] = {}
        self._lock = threading.Lock()
        self._default_ttl = default_ttl

    def get(self, key: str) -> tuple[Any, int] | None:
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            if time.time() - entry.created_at > entry.ttl_seconds:
                del self._entries[key]
                return None
            return entry.response, entry.status_code

    def set(self, key: str, response: Any, status_code: int, ttl: float | None = None):
        with self._lock:
            self._entries[key] = IdempotencyEntry(
                key=key,
                response=response,
                status_code=status_code,
                created_at=time.time(),
                ttl_seconds=ttl or self._default_ttl,
            )

    def prune(self):
        now = time.time()
        with self._lock:
            expired = [k for k, e in self._entries.items() if now - e.created_at > e.ttl_seconds]
            for k in expired:
                del self._entries[k]


# Global store
_idempotency_store = IdempotencyStore()


def get_idempotency(key: str) -> tuple[Any, int] | None:
    return _idempotency_store.get(key)


def set_idempotency(key: str, response: Any, status_code: int, ttl: float | None = None):
    _idempotency_store.set(key, response, status_code, ttl)


def prune_idempotency():
    _idempotency_store.prune()
