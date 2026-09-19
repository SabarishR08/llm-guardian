"""Prompt-length policy (ported from Prompt-Compliance-Automation).

Flags oversized prompts with a review-weight signal so the aggregator can
decide the verdict with all other evidence. The limit is runtime-tunable via
`GUARDIAN_MAX_PROMPT_LENGTH` (mirrors PCA's `max_prompt_length` setting).
"""

from __future__ import annotations

from app.core.config import settings
from app.engine.base import Detector, InspectionContext
from app.schemas.events import ThreatCategory


class LengthPolicyDetector(Detector):
    name = "LengthPolicyDetector"
    category = ThreatCategory.POLICY_VIOLATION
    tier = "heuristic"

    def inspect(self, ctx: InspectionContext) -> list[DetectionSignal]:
        limit = settings.max_prompt_length
        if limit <= 0 or len(ctx.raw) <= limit:
            return []
        return [
            self._signal(
                score=30.0,
                confidence=0.95,
                message=f"Prompt length {len(ctx.raw)} exceeds configured maximum of {limit} chars.",
                matched=[f"{len(ctx.raw)}>{limit}"],
            )
        ]
