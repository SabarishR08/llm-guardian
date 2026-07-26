"""WebSocket connection manager - broadcasts Guardian events to all clients."""

from __future__ import annotations

import asyncio

from fastapi import WebSocket

from app.schemas.events import GuardianEvent


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._connections.add(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(ws)

    @property
    def count(self) -> int:
        return len(self._connections)

    async def broadcast(self, event: GuardianEvent) -> None:
        payload = event.model_dump_json()
        dead: list[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_text(payload)
            except Exception:  # noqa: BLE001
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._connections.discard(ws)


manager = ConnectionManager()
