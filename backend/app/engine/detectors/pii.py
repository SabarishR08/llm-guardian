"""PII leakage detection with redaction.

Heuristic tier: high-precision regexes for emails, cards (Luhn-checked), SSNs,
phone numbers, and provider API-key formats.

ML tier (optional): Microsoft Presidio's NER catches names, locations, and
context-dependent identifiers the regexes miss.
"""

from __future__ import annotations

import re

from app.engine.base import Detector, InspectionContext
from app.schemas.events import DetectionSignal, ThreatCategory

_EMAIL = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_SSN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
_CARD = re.compile(r"\b(?:\d[ -]?){13,19}\b")
_PHONE = re.compile(r"\b\+?\d{1,2}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b")
_APIKEY = re.compile(r"\b(sk|pk|rk|ghp|gho|xox[bap]|AKIA|AIza)[-_A-Za-z0-9]{12,}\b")

_WEIGHTS = {"email": 38, "SSN": 66, "credit card": 62, "phone": 30, "API key": 72, "name/location (NER)": 40}


def _luhn_ok(number: str) -> bool:
    digits = [int(c) for c in number if c.isdigit()]
    if not 13 <= len(digits) <= 19:
        return False
    checksum = 0
    for i, d in enumerate(reversed(digits)):
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    return checksum % 10 == 0


class PIIDetector(Detector):
    name = "PIIDetector"
    category = ThreatCategory.PII_LEAKAGE
    tier = "hybrid"

    def __init__(self) -> None:
        self._analyzer = None
        try:  # optional upgrade
            from presidio_analyzer import AnalyzerEngine  # type: ignore

            self._analyzer = AnalyzerEngine()
        except Exception:  # noqa: BLE001
            self._analyzer = None

    @property
    def upgraded(self) -> bool:
        return self._analyzer is not None

    def find(self, text: str) -> dict[str, list[str]]:
        found: dict[str, list[str]] = {}

        def add(label: str, value: str) -> None:
            found.setdefault(label, []).append(value)

        for m in _EMAIL.findall(text):
            add("email", m)
        for m in _SSN.findall(text):
            add("SSN", m)
        for m in _CARD.finditer(text):
            if _luhn_ok(m.group(0)):
                add("credit card", m.group(0))
        for m in _APIKEY.findall(text):
            add("API key", m[0] if isinstance(m, tuple) else m)
        for m in _PHONE.findall(text):
            add("phone", m)

        if self._analyzer is not None:
            try:
                results = self._analyzer.analyze(text=text, language="en")
                for r in results:
                    if r.entity_type in {"PERSON", "LOCATION", "NRP"} and r.score > 0.6:
                        add("name/location (NER)", text[r.start : r.end])
            except Exception:  # noqa: BLE001
                pass
        return found

    def redact(self, text: str) -> str:
        redacted = text
        for pat in (_APIKEY, _CARD, _SSN, _EMAIL, _PHONE):
            redacted = pat.sub(lambda m: "•" * min(len(m.group(0)), 12), redacted)
        return redacted

    def inspect(self, ctx: InspectionContext) -> list[DetectionSignal]:
        found = self.find(ctx.raw)
        if not found:
            return []

        labels = list(found.keys())
        base = max(_WEIGHTS.get(lbl, 30) for lbl in labels)
        score = min(100.0, base + (len(labels) - 1) * 8)
        # Outbound PII is exfiltration - weight it up.
        if ctx.direction == "outbound":
            score = min(100.0, score + 6)

        samples = [v for vals in found.values() for v in vals][:5]
        return [
            self._signal(
                score=score,
                confidence=0.9,
                message=f"Detected {', '.join(labels)} in payload.",
                matched=samples,
            )
        ]
