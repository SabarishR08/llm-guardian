"""Report generation & export."""

from __future__ import annotations

import csv
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_user
from app.schemas.auth import User
from app.services.event_store import store

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/summary")
async def summary(_: User = Depends(get_current_user)) -> dict[str, object]:
    stats = await store.stats()
    events = await store.recent(300)
    categories: dict[str, int] = {}
    for e in events:
        if e.category.value != "benign":
            categories[e.category.value] = categories.get(e.category.value, 0) + 1
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "window": "last 24h",
        "stats": stats.model_dump(),
        "topCategories": sorted(
            ({"category": k, "count": v} for k, v in categories.items()),
            key=lambda x: x["count"],
            reverse=True,
        ),
    }


@router.get("/export.csv")
async def export_csv(
    limit: int = Query(500, ge=1, le=1000),
    _: User = Depends(get_current_user),
) -> StreamingResponse:
    events = await store.recent(limit)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        ["id", "timestamp", "direction", "source", "target", "tool", "category", "verdict", "severity", "riskScore", "latencyMs", "explanation"]
    )
    for e in events:
        writer.writerow(
            [e.id, e.timestamp, e.direction, e.source, e.target, e.tool or "", e.category.value, e.verdict.value, e.severity, e.riskScore, e.latencyMs, e.explanation]
        )
    buf.seek(0)
    filename = f"guardian-events-{datetime.now(timezone.utc):%Y%m%dT%H%M%S}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
