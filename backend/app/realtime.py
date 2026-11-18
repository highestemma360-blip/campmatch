import json
from typing import Dict, Set, Any
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        if user_id not in self.active:
            self.active[user_id] = set()
        self.active[user_id].add(ws)

    def disconnect(self, user_id: int, ws: WebSocket):
        conns = self.active.get(user_id)
        if not conns:
            return
        conns.discard(ws)
        if not conns:
            self.active.pop(user_id, None)

    def is_online(self, user_id: int) -> bool:
        return bool(self.active.get(user_id))

    def online_count(self) -> int:
        return len(self.active)

    def online_user_ids(self) -> list[int]:
        return list(self.active.keys())

    async def send_to_user(self, user_id: int, payload: Dict[str, Any]):
        conns = list(self.active.get(user_id, ()))
        if not conns:
            return
        data = json.dumps(payload)
        stale = []
        for ws in conns:
            try:
                await ws.send_text(data)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(user_id, ws)

    async def broadcast(self, payload: Dict[str, Any]):
        data = json.dumps(payload)
        for uid in list(self.active.keys()):
            conns = list(self.active.get(uid, ()))
            for ws in conns:
                try:
                    await ws.send_text(data)
                except Exception:
                    self.disconnect(uid, ws)


hub = ConnectionManager()
