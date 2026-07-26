"""MCP Guardian API - application entrypoint."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import attack_chains, auth, chat, detect, events, health, mcp, reports, ws
from app.engine.correlation import correlator
from app.core.config import settings
from app.engine.pipeline import engine
from app.schemas.events import InspectRequest
from app.services.event_store import store
from app.services.simulator import _random_request, simulator


async def _warm_up() -> None:
    """Run a small burst of real inspections at startup so the event buffer
    and traffic chart have something to show immediately.  All events are
    genuinely processed by the detection pipeline — no counters are pre-loaded
    with fake numbers."""
    for _ in range(20):
        try:
            event = await engine.inspect_to_event(_random_request())
            await store.add(event)
        except Exception:  # noqa: BLE001
            continue


@asynccontextmanager
async def lifespan(app: FastAPI):
    await store.connect()
    await _warm_up()
    simulator.start()
    yield
    await simulator.stop()


app = FastAPI(
    title="MCP Guardian",
    description="Real-time bidirectional security firewall for AI agents.",
    version=__version__,
    lifespan=lifespan,
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (health, auth, detect, events, reports, mcp, chat, attack_chains):
    app.include_router(module.router)
app.include_router(attack_chains.router_ws)
app.include_router(ws.router)


@app.get("/", tags=["health"])
async def root() -> dict[str, str]:
    return {
        "name": "MCP Guardian",
        "version": __version__,
        "docs": "/docs",
        "status": "operational",
    }
