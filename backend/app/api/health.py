"""Health & capability introspection."""

from __future__ import annotations

from fastapi import APIRouter

from app import __version__
from app.core.config import settings
from app.engine.llm import explainer
from app.engine.pipeline import engine
from app.services.event_store import store
from app.services.ws_manager import manager

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health() -> dict[str, object]:
    detectors = engine.capabilities()
    detector_latencies = engine.probe_latencies()

    # Build the system_components list that the dashboard's SystemHealthComponent
    # shape expects: { name, status, latencyMs, detail }
    system_components: list[dict[str, object]] = []

    # One row per detector.
    for d in detectors:
        name: str = d["name"]  # type: ignore[assignment]
        latency_ms = detector_latencies.get(name, 0.0)
        system_components.append(
            {
                "name": name,
                "status": "operational",
                "latencyMs": latency_ms,
                "detail": f"tier {d['tier']} · {'LLM-upgraded' if d['upgraded'] else 'heuristic'}",
            }
        )

    # WebSocket gateway.
    system_components.append(
        {
            "name": "WebSocket Gateway",
            "status": "operational",
            "latencyMs": 0,
            "detail": f"{manager.count} client{'s' if manager.count != 1 else ''} connected",
        }
    )

    # LLM explainer.
    llm_ok = bool(explainer.provider)
    system_components.append(
        {
            "name": f"LLM Explainer ({explainer.provider or 'none'})",
            "status": "operational" if llm_ok else "degraded",
            "latencyMs": 0,
            "detail": "primary" if llm_ok else "disabled — deterministic fallback active",
        }
    )

    # Event store.
    store_redis = store.backend == "redis"
    system_components.append(
        {
            "name": "Event Store",
            "status": "operational" if store_redis else "degraded",
            "latencyMs": 0,
            "detail": "Redis connected" if store_redis else "in-memory fallback (Redis unavailable)",
        }
    )

    return {
        "status": "operational",
        "version": __version__,
        "environment": settings.environment,
        "detectors": {
            "total": len(detectors),
            "upgraded": sum(1 for d in detectors if d["upgraded"]),
            "list": detectors,
        },
        "llm_provider": explainer.provider,
        "event_store": store.backend,
        "ws_clients": manager.count,
        "thresholds": {
            "sanitize": settings.threshold_sanitize,
            "quarantine": settings.threshold_quarantine,
            "block": settings.threshold_block,
        },
        # Structured list consumed directly by the dashboard's System health panel.
        "system_components": system_components,
    }
