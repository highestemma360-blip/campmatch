"""
Campmatch Cache Invalidation

TTL-based in-memory cache with invalidation support. Used for frequently-read
reference data (allowed domains, plus plans, feature flags, school list).
"""

import threading
import time
from typing import Any


class TTLCache:
    def __init__(self, default_ttl: float = 300.0):
        self._data: dict[str, tuple[Any, float]] = {}
        self._lock = threading.Lock()
        self._default_ttl = default_ttl

    def get(self, key: str) -> Any | None:
        with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            value, expiry = entry
            if time.time() > expiry:
                del self._data[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl: float | None = None):
        ttl = ttl or self._default_ttl
        with self._lock:
            self._data[key] = (value, time.time() + ttl)

    def delete(self, key: str):
        with self._lock:
            self._data.pop(key, None)

    def clear(self):
        with self._lock:
            self._data.clear()

    def sweep_expired(self) -> int:
        now = time.time()
        with self._lock:
            expired = [k for k, (_, exp) in self._data.items() if now > exp]
            for k in expired:
                del self._data[k]
            return len(expired)


# Global cache instance
cache = TTLCache(default_ttl=300.0)

# Cache key prefixes
CACHE_ALLOWED_DOMAINS = "cache:allowed_domains"
CACHE_PLUS_PLANS = "cache:plus_plans"
CACHE_FEATURE_FLAGS = "cache:feature_flags"
CACHE_SCHOOL_LIST = "cache:school_list"


def invalidate_cache(pattern_prefix: str):
    """Invalidate all cache keys starting with a prefix."""
    with cache._lock:
        keys = [k for k in cache._data if k.startswith(pattern_prefix)]
        for k in keys:
            del cache._data[k]
        return len(keys)
