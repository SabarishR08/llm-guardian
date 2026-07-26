"""Attack Chain API — REST + WebSocket endpoints.

GET  /api/attack-chains          list all detected chains
GET  /api/attack-chains/{id}     single chain detail
POST /api/attack-chains/simulate trigger live 3-hop demo
WS   /ws/chains                  real-time stream of new chains
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from app.engine.correlation import correlator
from app.services.event_store import store
from app.services.ws_manager import manager

router = APIRouter(prefix="/api", tags=["attack-chains"])


@router.get("/attack-chains")
async def get_attack_chains() -> dict[str, Any]:
    chains = correlator.get_all_chains()
    return {
        "challenge": {
            "teamName": "Mutex",
            "teamId": "RH-0045",
            "feature": "Multi-Tool Attack Chain Detection Engine",
            "status": "UNLOCKED & ACTIVE",
        },
        "totalChains": len(chains),
        "chains": chains,
    }


@router.get("/attack-chains/{chain_id}")
async def get_chain(chain_id: str) -> dict[str, Any]:
    chain = correlator.get_chain(chain_id)
    if chain is None:
        raise HTTPException(status_code=404, detail="Chain not found")
    return chain


@router.post("/attack-chains/simulate")
async def simulate_attack_chain() -> dict[str, Any]:
    """Trigger a live 3-hop attack simulation and broadcast over WebSocket."""
    chain, events = correlator.trigger_demo_simulation()

    for event in events:
        await store.add(event)
        await manager.broadcast(event)

    # Also push the new chain to WS chain subscribers.
    await correlator._publish(chain)

    return {
        "status": "success",
        "message": "Live multi-tool attack chain simulated.",
        "chain": chain.to_dict(),
        "eventsInjected": len(events),
    }


# ── WebSocket — live chain stream ──────────────────────────────────────────

router_ws = APIRouter(tags=["attack-chains"])


@router_ws.websocket("/ws/chains")
async def chains_stream(ws: WebSocket) -> None:
    """Stream new attack chains to the graph page in real time.

    On connect, replay existing chains so the graph is immediately populated.
    Then push every new chain as it is detected.
    """
    await ws.accept()
    queue = correlator.subscribe()
    try:
        # Backfill — send all current chains so a fresh client is up to date.
        for chain in correlator.get_all_chains():
            await ws.send_text(json.dumps(chain))

        # Live stream.
        while True:
            chain_dict = await queue.get()
            await ws.send_text(json.dumps(chain_dict))
    except WebSocketDisconnect:
        pass
    except Exception:  # noqa: BLE001
        pass
    finally:
        correlator.unsubscribe(queue)
