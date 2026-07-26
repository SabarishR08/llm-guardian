"""Event store - Redis-backed when available, in-memory ring buffer otherwise.

Also maintains rolling aggregate counters for the dashboard KPIs so the
`/api/stats` endpoint is O(1).
"""

from __future__ import annotations

import asyncio
from collections import deque

from app.core.config import settings
from app.schemas.events import GuardianEvent, StatsResponse, Verdict


class EventStore:
    def __init__(self) -> None:
        self._events: deque[GuardianEvent] = deque(maxlen=settings.event_buffer_size)
        self._lock = asyncio.Lock()
        self._redis = None
        self._counters = {
            "inspected": 0,
            "blocked": 0,
            "quarantined": 0,
            "sanitized": 0,
            "allowed": 0,
            "threats": 0,
            "risk_sum": 0.0,
            "latency_sum": 0.0,
        }
        # Distinct sources/tools seen in the event buffer — used to compute
        # activeAgents and connectedServers from real traffic instead of
        # hardcoded constants.
        self._seen_sources: set[str] = set()
        self._seen_tools: set[str] = set()

    async def connect(self) -> None:
        if not settings.redis_url:
            return
        try:
            import redis.asyncio as aioredis  # type: ignore

            self._redis = aioredis.from_url(settings.redis_url, decode_responses=True)
            await self._redis.ping()
        except Exception:  # noqa: BLE001 - fall back to memory
            self._redis = None

    @property
    def backend(self) -> str:
        return "redis" if self._redis is not None else "memory"

    async def add(self, event: GuardianEvent) -> None:
        async with self._lock:
            self._events.appendleft(event)
            c = self._counters
            c["inspected"] += 1
            c["risk_sum"] += event.riskScore
            c["latency_sum"] += event.latencyMs
            if event.verdict == Verdict.BLOCK:
                c["blocked"] += 1
            elif event.verdict == Verdict.QUARANTINE:
                c["quarantined"] += 1
            elif event.verdict == Verdict.SANITIZE:
                c["sanitized"] += 1
            else:
                c["allowed"] += 1
            if event.category.value != "benign":
                c["threats"] += 1

            # Track distinct agent sources and tools for live inventory.
            if event.source:
                self._seen_sources.add(event.source)
            if event.tool:
                self._seen_tools.add(event.tool)

        if self._redis is not None:
            try:
                await self._redis.lpush("guardian:events", event.model_dump_json())
                await self._redis.ltrim("guardian:events", 0, settings.event_buffer_size - 1)
            except Exception:  # noqa: BLE001
                pass

    async def recent(self, limit: int = 100) -> list[GuardianEvent]:
        async with self._lock:
            return list(self._events)[:limit]

    async def stats(self) -> StatsResponse:
        async with self._lock:
            c = self._counters
            inspected = max(c["inspected"], 1)
            # activeAgents: distinct sources that have sent traffic.
            # connectedServers: distinct tool names that have been called.
            # Both are at least 1 when any traffic has flowed.
            active_agents = max(len(self._seen_sources), 1 if c["inspected"] > 0 else 0)
            connected_servers = max(len(self._seen_tools), 1 if c["inspected"] > 0 else 0)
            return StatsResponse(
                inspected=c["inspected"],
                blocked=c["blocked"],
                quarantined=c["quarantined"],
                sanitized=c["sanitized"],
                threatsToday=c["threats"],
                avgRiskScore=round(c["risk_sum"] / inspected, 1),
                avgLatencyMs=round(c["latency_sum"] / inspected, 1),
                activeAgents=active_agents,
                connectedServers=connected_servers,
                blockRate=round(c["blocked"] / inspected * 100, 1),
            )

    async def inventory(self) -> tuple[list[str], list[str]]:
        """Return (sources, tools) seen so far — used by the health endpoint."""
        async with self._lock:
            return list(self._seen_sources), list(self._seen_tools)


# Module-level singleton — import with `from app.services.event_store import store`.
# Call `await store.connect()` during application startup to wire up Redis if available.
store = EventStore()
