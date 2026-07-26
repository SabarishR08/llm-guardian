"""Tool-poisoning detection.

Malicious MCP tool descriptions or responses embed hidden directives (HTML
comments, bracketed system tags, zero-width payloads, or "when you call this
tool, also…" instructions) designed to manipulate the agent. Outbound tool
responses are scrutinized more aggressively than inbound prompts.
"""

from __future__ import annotations

import re

from app.engine.base import Detector, InspectionContext
from app.schemas.events import DetectionSignal, ThreatCategory

_PATTERNS: list[tuple[re.Pattern[str], float, str]] = [
    (re.compile(r"<!--[\s\S]*?(instruction|ignore|system|send|exfiltrat|http|secret)[\s\S]*?-->", re.I), 78, "hidden-html-comment"),
    (re.compile(r"\[\[?\s*(system|hidden|secret|internal)\s*:?[\s\S]{0,80}?\]\]?", re.I), 74, "bracketed-directive"),
    (re.compile(r"(when|before|after)\s+(calling|using|invoking)\s+this\s+tool.{0,60}(also|always|secretly|silently)", re.I), 82, "conditional-directive"),
    (re.compile(r"(read|send|forward|upload|post)\b.{0,40}(\.ssh|id_rsa|\.env|credentials|history|http[s]?://)", re.I), 84, "exfil-instruction"),
    (re.compile(r"\b(this|the)\s+tool\s+(requires|needs)\s+you\s+to\s+(ignore|bypass|disable)", re.I), 80, "tool-requires-bypass"),
]


class ToolPoisoningDetector(Detector):
    name = "ToolPoisoningDetector"
    category = ThreatCategory.TOOL_POISONING
    tier = "heuristic"

    def inspect(self, ctx: InspectionContext) -> list[DetectionSignal]:
        matched: list[str] = []
        best = 0.0
        labels: set[str] = set()

        for hay in [ctx.raw, ctx.normalized, *ctx.decoded_variants]:
            for pattern, weight, label in _PATTERNS:
                m = pattern.search(hay)
                if m:
                    matched.append(m.group(0))
                    best = max(best, weight)
                    labels.add(label)

        # Zero-width characters in tool metadata are a strong signal.
        if any(0x200B <= ord(c) <= 0x200F or ord(c) == 0xFEFF for c in ctx.raw):
            best = max(best, 68)
            labels.add("zero-width-payload")
            matched.append("<zero-width characters>")

        if best == 0:
            return []

        # Poisoning via a tool response (outbound) is more dangerous.
        if ctx.direction == "outbound":
            best = min(100.0, best + 8)

        return [
            self._signal(
                score=best,
                confidence=0.62 + 0.09 * len(labels),
                message=f"Concealed directive in tool metadata/response: {', '.join(sorted(labels))}.",
                matched=matched,
            )
        ]
