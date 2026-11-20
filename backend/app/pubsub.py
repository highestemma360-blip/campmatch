"""
Campmatch Pub/Sub

In-memory publish/subscribe bus for decoupled, event-driven communication
between services (user signup -> welcome email, payment success -> activate plus,
match created -> notify users).

Can be backed by Redis for multi-node deployments.
"""

import threading
from collections import defaultdict
from typing import Any, Callable


class PubSub:
    def __init__(self):
        self._subscribers: dict[str, list[Callable]] = defaultdict(list)
        self._lock = threading.Lock()

    def subscribe(self, topic: str, callback: Callable[[str, Any], None]):
        with self._lock:
            self._subscribers[topic].append(callback)

    def unsubscribe(self, topic: str, callback: Callable[[str, Any], None]):
        with self._lock:
            if topic in self._subscribers:
                self._subscribers[topic] = [
                    cb for cb in self._subscribers[topic] if cb != callback
                ]

    def publish(self, topic: str, data: Any):
        """Publish an event to all subscribers of a topic (synchronous)."""
        with self._lock:
            callbacks = list(self._subscribers.get(topic, []))
        for cb in callbacks:
            try:
                cb(topic, data)
            except Exception:
                # Never let one subscriber failure break others
                pass

    def publish_async(self, topic: str, data: Any):
        """Publish an event in a background thread (non-blocking)."""
        threading.Thread(
            target=self.publish, args=(topic, data), daemon=True
        ).start()

    def topics(self) -> list[str]:
        with self._lock:
            return list(self._subscribers.keys())


# Global pub/sub bus
bus = PubSub()
