"""Ops-configurable keyword policy (ported from Prompt-Compliance-Automation).

Complements the regex PolicyEngine with two flat, editable word lists loaded
from the JSON settings file (`policy_keywords.json`):

- **blocked**: any hit is an outright block (e.g. passwords, API keys).
- **flagged**: any hit adds a review signal (e.g. "confidential", "internal use").

Both lists are substring matches against the normalized content, matching the
original semantics. Edits to the JSON file take effect on the next request —
no redeploy — so security ops can tune the policy without touching code.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.engine.base import Detector, InspectionContext
from app.schemas.events import ThreatCategory

_DEFAULTS: dict[str, list[str]] = {
    "blocked": [
        "password",
        "passkey",
        "passcode",
        "ssn",
        "credit card",
        "social security number",
        "token",
        "api key",
    ],
    "flagged": [
        "confidential",
        "secret",
        "internal use",
    ],
}


def _load_lists() -> dict[str, list[str]]:
    path = Path(__file__).resolve().parents[3] / "policy_keywords.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return {
            "blocked": [str(k).lower() for k in data.get("blocked", _DEFAULTS["blocked"])],
            "flagged": [str(k).lower() for k in data.get("flagged", _DEFAULTS["flagged"])],
        }
    except Exception:  # noqa: BLE001 - missing/malformed file must not break startup
        return _DEFAULTS


class KeywordPolicyDetector(Detector):
    """Substring keyword policy with blocked/flagged semantics."""

    name = "KeywordPolicyDetector"
    category = ThreatCategory.POLICY_VIOLATION
    tier = "heuristic"

    def __init__(self) -> None:
        self._lists = _load_lists()

    @property
    def blocked_keywords(self) -> list[str]:
        return list(self._lists["blocked"])

    @property
    def flagged_keywords(self) -> list[str]:
        return list(self._lists["flagged"])

    def reload(self) -> None:
        """Re-read the settings file (also lets tests inject lists)."""
        self._lists = _load_lists()

    def inspect(self, ctx: InspectionContext) -> list[DetectionSignal]:
        from app.schemas.events import DetectionSignal

        text = ctx.normalized.lower()
        blocked_hits = [kw for kw in self._lists["blocked"] if kw in text]
        flagged_hits = [kw for kw in self._lists["flagged"] if kw in text]

        signals: list[DetectionSignal] = []
        if blocked_hits:
            signals.append(
                self._signal(
                    score=88.0,
                    confidence=0.9,
                    message=f"Blocked keyword detected: {', '.join(blocked_hits)}.",
                    matched=blocked_hits,
                )
            )
        if flagged_hits:
            signals.append(
                self._signal(
                    score=42.0,
                    confidence=0.65,
                    message=f"Flagged keyword detected: {', '.join(flagged_hits)}.",
                    matched=flagged_hits,
                )
            )
        return signals
