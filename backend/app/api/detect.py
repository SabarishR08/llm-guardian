"""Inspection endpoints - the public firewall API."""

from __future__ import annotations

from fastapi import APIRouter

from app.engine.pipeline import engine
from app.schemas.events import InspectRequest, InspectResponse
from app.services.event_store import store
from app.services.ws_manager import manager

router = APIRouter(prefix="/api", tags=["detect"])


@router.post("/inspect", response_model=InspectResponse)
async def inspect(body: InspectRequest) -> InspectResponse:
    """Inspect a single message and return the full assessment.

    This is the endpoint an MCP proxy calls inline for every request/response.
    Non-benign inspections are also recorded and streamed to the dashboard.
    """
    event = await engine.inspect_to_event(body)
    if event.category.value != "benign":
        await store.add(event)
        await manager.broadcast(event)
    return InspectResponse(
        riskScore=event.riskScore,
        category=event.category,
        verdict=event.verdict,
        severity=event.severity,
        explanation=event.explanation,
        recommendedAction=event.recommendedAction,
        signals=event.signals,
        sanitized=event.preview if event.category.value == "pii_leakage" else None,
        latencyMs=event.latencyMs,
        llmReasoned=event.llmReasoned,
    )
