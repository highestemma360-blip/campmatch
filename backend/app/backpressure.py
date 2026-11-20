"""
Campmatch Backpressure

Protects WebSocket and connection endpoints from being overwhelmed by
slow consumers. Tracks per-user message queues and applies backpressure
when queues exceed thresholds.
"""

import threading
import time
from collections import deque
from typing import Any


class BackpressureController:
    def __init__(self, max_queue_size: int = 1000, drop_policy: str = "drop_oldest"):
        self._max_queue_size = max_queue_size
        self._drop_policy = drop_policy  # "drop_oldest" | "drop_newest" | "block"
        self._queues: dict[str, deque] = {}
        self._locks: dict[str, threading.Lock] = {}
        self._global_lock = threading.Lock()

    def _get_queue(self, user_id: str) -> deque:
        with self._global_lock:
            if user_id not in self._queues:
                self._queues[user_id] = deque(maxlen=self._max_queue_size)
                self._locks[user_id] = threading.Lock()
            return self._queues[user_id]

    def _get_lock(self, user_id: str) -> threading.Lock:
        with self._global_lock:
            if user_id not in self._locks:
                self._locks[user_id] = threading.Lock()
            return self._locks[user_id]

    def enqueue(self, user_id: str, message: Any) -> bool:
        """
        Try to enqueue a message for a user.
        Returns True if enqueued, False if backpressure is applied (message dropped).
        """
        q = self._get_queue(user_id)
        lock = self._get_lock(user_id)

        with lock:
            if len(q) >= self._max_queue_size:
                if self._drop_policy == "drop_oldest":
                    q.popleft()
                    q.append({"type": "backpressure", "message": "queue_full", "ts": time.time()})
                    return True  # still accepted (dropped old)
                elif self._drop_policy == "drop_newest":
                    return False  # reject new message
                # block policy: accept but caller should slow down
            q.append(message)
            return True

    def dequeue(self, user_id: str) -> Any | None:
        q = self._get_queue(user_id)
        lock = self._get_lock(user_id)
        with lock:
            if q:
                return q.popleft()
            return None

    def queue_size(self, user_id: str) -> int:
        q = self._get_queue(user_id)
        lock = self._get_lock(user_id)
        with lock:
            return len(q)

    def clear(self, user_id: str):
        q = self._get_queue(user_id)
        lock = self._get_lock(user_id)
        with lock:
            q.clear()


# Global backpressure controller
backpressure = BackpressureController(max_queue_size=500)
