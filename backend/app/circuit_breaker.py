"""
Campmatch Circuit Breaker

Protects against cascading failures when calling external services
(Google OAuth, payment gateway, AI moderation, etc.).

States:
  - CLOSED: requests pass through normally
  - OPEN: requests fail fast (circuit tripped)
  - HALF_OPEN: trial requests to test recovery
"""

import time
import threading
from enum import Enum
from dataclasses import dataclass, field


class CircuitState(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class CircuitBreaker:
    name: str
    failure_threshold: int = 5
    recovery_timeout_seconds: float = 30.0
    half_open_max_calls: int = 3

    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _failures: int = field(default=0, init=False)
    _last_failure_time: float | None = field(default=None, init=False)
    _half_open_calls: int = field(default=0, init=False)
    _lock: threading.Lock = field(default_factory=threading.Lock, init=False)

    def call(self, fn, *args, **kwargs):
        """Execute `fn` through the circuit breaker."""
        with self._lock:
            if self._state == CircuitState.OPEN:
                if self._last_failure_time and (
                    time.time() - self._last_failure_time >= self.recovery_timeout_seconds
                ):
                    self._state = CircuitState.HALF_OPEN
                    self._half_open_calls = 0
                else:
                    raise CircuitOpenError(f"Circuit '{self.name}' is OPEN")

        try:
            result = fn(*args, **kwargs)
        except Exception as exc:
            self._record_failure()
            raise exc

        self._record_success()
        return result

    def _record_failure(self):
        with self._lock:
            self._failures += 1
            self._last_failure_time = time.time()
            if self._state == CircuitState.HALF_OPEN:
                self._state = CircuitState.OPEN
                self._half_open_calls = 0
            elif self._failures >= self.failure_threshold:
                self._state = CircuitState.OPEN

    def _record_success(self):
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._half_open_calls += 1
                if self._half_open_calls >= self.half_open_max_calls:
                    self._state = CircuitState.CLOSED
                    self._failures = 0
                    self._last_failure_time = None
            else:
                self._failures = max(0, self._failures - 1)


class CircuitOpenError(Exception):
    pass


# Registry of named breakers
_breakers: dict[str, CircuitBreaker] = {}
_breakers_lock = threading.Lock()


def get_breaker(name: str, **kwargs) -> CircuitBreaker:
    with _breakers_lock:
        if name not in _breakers:
            _breakers[name] = CircuitBreaker(name=name, **kwargs)
        return _breakers[name]


def get_all_breaker_states() -> dict[str, str]:
    with _breakers_lock:
        return {name: b._state.value for name, b in _breakers.items()}
