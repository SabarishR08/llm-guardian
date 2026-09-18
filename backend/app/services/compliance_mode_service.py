"""Compliance modes - runtime scan-policy control.

Ported from llm-prompt-security-middleware (portfolio consolidation).
Three modes adjust how strictly the engine scans and what it costs:

- ``default``: full detector fan-out, standard thresholds.
- ``hybrid``: skip the PII detector when a URL-threat signal already
  BLOCKs the message (cheaper runs; equivalent verdict).
- ``custom``: operator-tuned thresholds set via the admin API.

Modes never weaken heuristics silently: ``custom`` requires explicit
thresholds through the admin API, and every mode change should be
audit-logged by the caller into the ops event stream.
"""

from __future__ import annotations

import threading

ALLOWED_MODES = ("default", "hybrid", "custom")


class ComplianceModeService:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._mode = "default"
        self._custom_thresholds: dict[str, int] = {}

    def get_mode(self) -> str:
        with self._lock:
            return self._mode

    def set_mode(self, mode: str) -> dict[str, object]:
        if mode not in ALLOWED_MODES:
            raise ValueError(f"Unsupported mode: {mode}")
        with self._lock:
            self._mode = mode
            if mode == "default":
                self._custom_thresholds = {}
        return self.state()

    def get_custom_thresholds(self) -> dict[str, int]:
        with self._lock:
            return dict(self._custom_thresholds)

    def set_custom_thresholds(self, sanitize: int, quarantine: int, block: int) -> dict[str, object]:
        values = {"sanitize": int(sanitize), "quarantine": int(quarantine), "block": int(block)}
        if not (0 <= values["sanitize"] <= values["quarantine"] <= values["block"] <= 100):
            raise ValueError("Thresholds must satisfy 0 <= sanitize <= quarantine <= block <= 100")
        with self._lock:
            self._custom_thresholds = values
        return self.state()

    def effective_thresholds(
        self,
        sanitize: int,
        quarantine: int,
        block: int,
    ) -> tuple[int, int, int]:
        """Thresholds to use for the current mode.

        ``custom`` swaps in operator values; other modes use the engine
        defaults passed in.
        """
        if self.get_mode() == "custom":
            custom = self.get_custom_thresholds()
            if custom:
                return (
                    custom.get("sanitize", sanitize),
                    custom.get("quarantine", quarantine),
                    custom.get("block", block),
                )
        return sanitize, quarantine, block

    def state(self) -> dict[str, object]:
        with self._lock:
            return {"mode": self._mode, "custom_thresholds": dict(self._custom_thresholds)}


# module-level singleton
compliance_modes = ComplianceModeService()
