"""WebSocket streaming endpoint.

On connect, replays the most recent events (so a freshly-opened dashboard is
immediately populated), then streams new events as they're inspected.
"""

from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.event_store import store
from app.services.ws_manager import manager

router = APIRouter(tags=["ws"])


@router.websocket("/ws/stream")
async def stream(ws: WebSocket) -> None:
    await manager.connect(ws)
    try:
        # backfill (oldest → newest so the client prepends correctly)
        recent = await store.recent(40)
        for event in reversed(recent):
            await ws.send_text(event.model_dump_json())

        # keep the socket open; the manager broadcasts new events
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(ws)
    except Exception:  # noqa: BLE001
        await manager.disconnect(ws)
