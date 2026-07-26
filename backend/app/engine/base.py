"""Detector base class and shared primitives.

Every detector is a self-contained plugin that inspects normalized content and
emits zero or more :class:`DetectionSignal`. Detectors declare a capability
tier so the engine can report which upgrades (ML models) are active, but a
detector must *always* produce a usable heuristic result even when its optional
model is unavailable.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field

from app.schemas.events import DetectionSignal, ThreatCategory


@dataclass
class InspectionContext:
    """Everything a detector needs to assess a single message."""

    raw: str
    normalized: str
    direction: str = "inbound"
    tool: str | None = None
    # Decoded variants surfaced by the normalizer (base64, hex, url, entities…)
    decoded_variants: list[str] = field(default_factory=list)


class Detector(abc.ABC):
    #: Human-readable detector name (also used as the signal's `detector`).
    name: str = "Detector"
    #: The threat category this detector is responsible for.
    category: ThreatCategory = ThreatCategory.BENIGN
    #: "heuristic" | "ml" | "hybrid" - reported in /api/health.
    tier: str = "heuristic"

    @property
    def upgraded(self) -> bool:
        """True when an optional ML backend is loaded for this detector."""
        return False

    @abc.abstractmethod
    def inspect(self, ctx: InspectionContext) -> list[DetectionSignal]:
        """Return signals for this message (empty list == clean)."""
        raise NotImplementedError

    def _signal(
        self,
        score: float,
        confidence: float,
        message: str,
        matched: list[str] | None = None,
    ) -> DetectionSignal:
        return DetectionSignal(
            detector=self.name,
            category=self.category,
            score=max(0.0, min(100.0, score)),
            confidence=max(0.0, min(1.0, confidence)),
            matched=[m[:80] for m in (matched or [])],
            message=message,
        )
