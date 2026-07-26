"""Event & stats read endpoints (auth-protected)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.schemas.auth import User
from app.schemas.events import GuardianEvent, StatsResponse
from app.services.event_store import store

router = APIRouter(prefix="/api", tags=["events"])


@router.get("/events", response_model=list[GuardianEvent])
async def list_events(
    limit: int = Query(100, ge=1, le=500),
    _: User = Depends(get_current_user),
) -> list[GuardianEvent]:
    return await store.recent(limit)


@router.get("/stats", response_model=StatsResponse)
async def get_stats(_: User = Depends(get_current_user)) -> StatsResponse:
    return await store.stats()
