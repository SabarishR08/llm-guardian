"""Declarative policy engine.

Organization-specific rules expressed as simple regex → weight mappings. In a
real deployment these load from config; here we ship a sensible default set
covering security-control tampering and high-risk financial/destructive actions.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.engine.base import Detector, InspectionContext
from app.schemas.events import DetectionSignal, ThreatCategory


@dataclass(frozen=True)
class PolicyRule:
    id: str
    pattern: re.Pattern[str]
    weight: float
    description: str


DEFAULT_RULES: list[PolicyRule] = [
    PolicyRule("SEC-001", re.compile(r"\b(disable|turn\s+off|bypass)\s+(security|auth|logging|audit|guardian|firewall)", re.I), 66, "Attempt to disable a security control"),
    PolicyRule("FIN-001", re.compile(r"\b(wire\s+transfer|send\s+money|crypto\s+wallet|initiate\s+(a\s+)?payment)\b", re.I), 58, "High-risk financial action"),
    PolicyRule("DAT-001", re.compile(r"\bdelete\s+(all|the|every)\s+(logs|records|rows|database|users|tables)\b", re.I), 62, "Destructive data operation"),
    PolicyRule("SEC-002", re.compile(r"\b(sudo|rm\s+-rf|chmod\s+777|curl\s+.+\|\s*(sh|bash))\b", re.I), 60, "Dangerous shell command"),
    PolicyRule("DAT-002", re.compile(r"\b(export|dump)\s+(the\s+)?(entire\s+)?(database|user\s+table|customer\s+list)\b", re.I), 56, "Bulk data export"),
]


class PolicyEngine(Detector):
    name = "PolicyEngine"
    category = ThreatCategory.POLICY_VIOLATION
    tier = "heuristic"

    def __init__(self, rules: list[PolicyRule] | None = None) -> None:
        self.rules = rules or DEFAULT_RULES

    def inspect(self, ctx: InspectionContext) -> list[DetectionSignal]:
        matched: list[str] = []
        best = 0.0
        hit_ids: list[str] = []

        for rule in self.rules:
            m = rule.pattern.search(ctx.normalized)
            if m:
                matched.append(m.group(0))
                best = max(best, rule.weight)
                hit_ids.append(rule.id)

        if best == 0:
            return []

        return [
            self._signal(
                score=best,
                confidence=0.72,
                message=f"Policy violation ({', '.join(hit_ids)}).",
                matched=matched,
            )
        ]
