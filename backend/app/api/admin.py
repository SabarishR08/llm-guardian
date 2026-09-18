"""Admin API - compliance modes and cache stats.

Ported from llm-prompt-security-middleware's admin surface (portfolio
consolidation), conformed to Guardian's JWT auth (get_current_user) with
role checks: mode changes require admin/analyst; cache reset requires admin.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.config import settings
from app.schemas.auth import User
from app.services.compliance_mode_service import compliance_modes
from app.services.safe_prompt_cache import safe_prompt_cache

router = APIRouter(prefix="/api/admin", tags=["admin"])


class ModeUpdate(BaseModel):
    mode: str


class ThresholdUpdate(BaseModel):
    sanitize: int
    quarantine: int
    block: int


def _require_role(user: User, *roles: str) -> None:
    if user.role not in roles:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Requires role in {list(roles)}",
        )


@router.get("/compliance")
async def get_compliance(user: User = Depends(get_current_user)) -> dict:
    state = compliance_modes.state()
    state["defaults"] = {
        "sanitize": settings.threshold_sanitize,
        "quarantine": settings.threshold_quarantine,
        "block": settings.threshold_block,
    }
    return state


@router.put("/compliance/mode")
async def set_mode(body: ModeUpdate, user: User = Depends(get_current_user)) -> dict:
    _require_role(user, "admin", "analyst")
    try:
        state = compliance_modes.set_mode(body.mode)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return state


@router.put("/compliance/thresholds")
async def set_thresholds(body: ThresholdUpdate, user: User = Depends(get_current_user)) -> dict:
    _require_role(user, "admin", "analyst")
    if compliance_modes.get_mode() != "custom":
        compliance_modes.set_mode("custom")
    try:
        return compliance_modes.set_custom_thresholds(
            body.sanitize, body.quarantine, body.block
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc


@router.get("/cache/stats")
async def cache_stats(user: User = Depends(get_current_user)) -> dict:
    return safe_prompt_cache.stats()


@router.delete("/cache")
async def cache_clear(user: User = Depends(get_current_user)) -> dict:
    _require_role(user, "admin")
    safe_prompt_cache.clear()
    return {"cleared": True, **safe_prompt_cache.stats()}
