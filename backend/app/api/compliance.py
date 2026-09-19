"""Compliance reporting API (ported from Prompt-Compliance-Automation).

PCA's `/get_logs` exposed filtered, paginated audit logs (status filter,
limit/offset window, total count) so compliance officers could pull exactly
the events they needed. This router brings the same semantics to Guardian's
event store:

- `GET /api/compliance/events?verdict=BLOCK&category=policy_violation&limit=200&offset=0`
- `GET /api/compliance/report` — verdict/category/status breakdown over the
  retained window.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.schemas.auth import User
from app.schemas.events import ThreatCategory, Verdict
from app.services.event_store import store

router = APIRouter(prefix="/api/compliance", tags=["compliance"])

VerdictFilter = Literal["ALLOW", "SANITIZE", "QUARANTINE", "BLOCK"]


@router.get("/events")
async def compliance_events(
    verdict: VerdictFilter | None = None,
    category: ThreatCategory | None = None,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    _: User = Depends(get_current_user),
) -> dict[str, object]:
    events = await store.recent(1000)  # full retained window
    matching = [
        e
        for e in events
        if (verdict is None or e.verdict.value == verdict)
        and (category is None or e.category.value == category.value)
    ]
    total = len(matching)
    window = matching[offset : offset + limit]
    return {
        "logs": [e.model_dump() for e in window],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/report")
async def compliance_report(_: User = Depends(get_current_user)) -> dict[str, object]:
    events = await store.recent(1000)
    by_verdict: dict[str, int] = {}
    by_category: dict[str, int] = {}
    flagged: list[dict[str, str]] = []
    for e in events:
        by_verdict[e.verdict.value] = by_verdict.get(e.verdict.value, 0) + 1
        by_category[e.category.value] = by_category.get(e.category.value, 0) + 1
        if e.verdict.value in ("QUARANTINE", "BLOCK"):
            flagged.append({"id": e.id, "category": e.category.value, "riskScore": str(e.riskScore)})
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "window": "retained buffer (up to 1000 events)",
        "byVerdict": by_verdict,
        "byCategory": by_category,
        "flagged": flagged[:50],
    }
