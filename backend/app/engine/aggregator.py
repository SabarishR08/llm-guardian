"""Risk aggregation - fuse detector signals into a single verdict."""

from __future__ import annotations

from app.core.config import settings
from app.schemas.events import DetectionSignal, Severity, ThreatCategory, Verdict


def verdict_for_score(score: float) -> Verdict:
    if score >= settings.threshold_block:
        return Verdict.BLOCK
    if score >= settings.threshold_quarantine:
        return Verdict.QUARANTINE
    if score >= settings.threshold_sanitize:
        return Verdict.SANITIZE
    return Verdict.ALLOW


def severity_for_score(score: float) -> Severity:
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"


class Aggregation:
    def __init__(
        self,
        risk_score: float,
        category: ThreatCategory,
        verdict: Verdict,
        severity: Severity,
        signals: list[DetectionSignal],
    ) -> None:
        self.risk_score = risk_score
        self.category = category
        self.verdict = verdict
        self.severity = severity
        self.signals = signals


def aggregate(signals: list[DetectionSignal]) -> Aggregation:
    """Weighted fusion.

    The dominant signal sets the floor; corroborating signals add a
    diminishing contribution. Confidence scales each contribution so a
    low-confidence hit can't single-handedly escalate a verdict.
    """
    if not signals:
        return Aggregation(0.0, ThreatCategory.BENIGN, Verdict.ALLOW, "low", [])

    ordered = sorted(signals, key=lambda s: s.score * (0.5 + 0.5 * s.confidence), reverse=True)
    dominant = ordered[0]
    risk = dominant.score * (0.7 + 0.3 * dominant.confidence)

    for i, sig in enumerate(ordered[1:], start=1):
        risk += sig.score * sig.confidence * (0.2 / i)

    risk = round(min(100.0, risk), 1)
    return Aggregation(
        risk_score=risk,
        category=dominant.category,
        verdict=verdict_for_score(risk),
        severity=severity_for_score(risk),
        signals=ordered,
    )
