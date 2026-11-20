"""
Campmatch Dead Letter Queue

Stores messages that could not be processed after retries are exhausted
(failed webhooks, failed payments, failed AI moderation, etc.).
Provides an admin API to inspect and replay DLQ items.
"""

import threading
from datetime import datetime, timezone
from typing import Any


class DeadLetterQueue:
    def __init__(self, max_size: int = 10000):
        self._queue: list[dict] = []
        self._lock = threading.Lock()
        self._max_size = max_size

    def enqueue(
        self,
        source: str,
        payload: Any,
        error: str,
        metadata: dict | None = None,
    ) -> str:
        item_id = f"{source}-{int(time.time() * 1000)}"
        item = {
            "id": item_id,
            "source": source,
            "payload": payload,
            "error": str(error),
            "metadata": metadata or {},
            "failed_at": datetime.now(timezone.utc).isoformat(),
            "replayed": False,
        }
        with self._lock:
            self._queue.append(item)
            if len(self._queue) > self._max_size:
                self._queue.pop(0)
        return item_id

    def list(self, source: str | None = None, unplayed_only: bool = False) -> list[dict]:
        with self._lock:
            items = list(self._queue)
        if source:
            items = [i for i in items if i["source"] == source]
        if unplayed_only:
            items = [i for i in items if not i.get("replayed")]
        return items

    def mark_replayed(self, item_id: str) -> bool:
        with self._lock:
            for item in self._queue:
                if item["id"] == item_id:
                    item["replayed"] = True
                    item["replayed_at"] = datetime.now(timezone.utc).isoformat()
                    return True
        return False

    def clear(self):
        with self._lock:
            self._queue.clear()

    def count(self) -> int:
        with self._lock:
            return len(self._queue)


import time  # noqa: E402

dlq = DeadLetterQueue()
