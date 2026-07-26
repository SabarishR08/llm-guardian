"""Schema anomaly detection.

For tool responses, unexpected structure (deeply nested JSON, oversized
payloads, or an unusual density of structural characters) can indicate an
attempt to smuggle data or break the declared contract.
"""

from __future__ import annotations

import json

from app.engine.base import Detector, InspectionContext
from app.schemas.events import DetectionSignal, ThreatCategory


class SchemaAnomalyDetector(Detector):
    name = "SchemaAnomalyDetector"
    category = ThreatCategory.SCHEMA_ANOMALY
    tier = "heuristic"

    def inspect(self, ctx: InspectionContext) -> list[DetectionSignal]:
        text = ctx.raw
        reasons: list[str] = []
        score = 0.0

        struct_chars = sum(text.count(c) for c in "{}[]")
        if len(text) > 4000:
            score = max(score, 40)
            reasons.append("oversized payload")
        if struct_chars > 60:
            score = max(score, 38)
            reasons.append("excessive nesting")

        # Try to parse JSON and look for depth / suspicious keys.
        stripped = text.strip()
        if stripped[:1] in "{[":
            try:
                obj = json.loads(stripped)
                depth = _depth(obj)
                if depth > 6:
                    score = max(score, 44)
                    reasons.append(f"nesting depth {depth}")
                if _has_suspicious_keys(obj):
                    score = max(score, 50)
                    reasons.append("unexpected control keys")
            except (json.JSONDecodeError, RecursionError):
                if struct_chars > 20:
                    score = max(score, 34)
                    reasons.append("malformed structure")

        if score == 0:
            return []

        return [
            self._signal(
                score=score,
                confidence=0.55,
                message=f"Payload structure deviates from contract: {', '.join(reasons)}.",
                matched=reasons,
            )
        ]


def _depth(obj: object, level: int = 1) -> int:
    if isinstance(obj, dict):
        return max([level] + [_depth(v, level + 1) for v in obj.values()])
    if isinstance(obj, list):
        return max([level] + [_depth(v, level + 1) for v in obj])
    return level


_SUSPICIOUS_KEYS = {"__proto__", "constructor", "system", "instructions", "exec", "eval", "cmd"}


def _has_suspicious_keys(obj: object) -> bool:
    if isinstance(obj, dict):
        if any(str(k).lower() in _SUSPICIOUS_KEYS for k in obj):
            return True
        return any(_has_suspicious_keys(v) for v in obj.values())
    if isinstance(obj, list):
        return any(_has_suspicious_keys(v) for v in obj)
    return False
