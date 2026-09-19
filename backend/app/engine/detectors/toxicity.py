"""Toxicity detection.

Heuristic tier: a lexicon of threat/abuse patterns.
ML tier (optional): Detoxify multilingual model for calibrated scoring.
"""

from __future__ import annotations

import re

from app.engine.base import Detector, InspectionContext
from app.engine.detectors.toxicity_thresholds import evaluate_labels
from app.schemas.events import DetectionSignal, ThreatCategory

_PATTERNS: list[tuple[re.Pattern[str], float]] = [
    # --- threats / violence ---
    (re.compile(r"\b(kill|destroy|attack|eliminate)\s+(you|them|him|her|everyone|all)\b", re.I), 70),
    (re.compile(r"\b(threat(en)?|harm|hurt|doxx?)\s+(you|your\s+family|them)\b", re.I), 74),
    # --- insults / harassment ---
    (re.compile(r"\b(idiot|moron|worthless|pathetic|scum|garbage|retard(ed)?)\b", re.I), 46),
    (re.compile(r"\byou('?re| are)\s+(so\s+)?(stupid|useless|worthless)\b", re.I), 52),
    (re.compile(r"\b(comply\s+or|or\s+face\s+the\s+consequences|you'?ll\s+regret)\b", re.I), 58),
    # --- sexual harassment / non-consensual sexual imagery ---
    # "see/send/show him nude", "want to see her naked", etc. Excludes idioms
    # like "naked eye" / "naked truth".
    (
        re.compile(
            r"\b(see|send|show|share|get|want|need|find)\b[^.?!\n]{0,25}\b(nude|naked)\b"
            r"(?!\s+(eye|eyes|truth|ambition|singularity|mole\s?rat))",
            re.I,
        ),
        90,
    ),
    (re.compile(r"\bsend\s+(me\s+)?(your\s+)?(nudes?|naked\s+(pic|photo|image|selfie)s?)\b", re.I), 92),
    (re.compile(r"\b(nudes|naked\s+(pic|photo|image|selfie)s?|dick\s+pics?|nsfw\s+(pic|photo|image)s?)\b", re.I), 72),
    (re.compile(r"\bsext(ing)?\b", re.I), 64),
    (re.compile(r"\b(have\s+sex|sleep\s+with|hook\s+up|make\s+out)\s+(with\s+)?(you|him|her|me|them)\b", re.I), 60),
    # --- hate slurs (unambiguous; idiom-prone terms deliberately excluded) ---
    (re.compile(r"\b(f[a4]gg?([o0]t)?|dyke|tr[a4]nny|n[i1]gg[e3]rs?|k[i1]kes?)\b", re.I), 90),
]


class ToxicityDetector(Detector):
    name = "ToxicityDetector"
    category = ThreatCategory.TOXICITY
    tier = "hybrid"

    def __init__(self) -> None:
        self._model = None
        try:  # optional upgrade
            from detoxify import Detoxify  # type: ignore

            self._model = Detoxify("original")
        except Exception:  # noqa: BLE001
            self._model = None

    @property
    def upgraded(self) -> bool:
        return self._model is not None

    def _ml_scores(self, text: str) -> dict[str, float]:
        if self._model is None:
            return {}
        try:
            res = self._model.predict(text)
            return {str(k): float(v) for k, v in res.items()}
        except Exception:  # noqa: BLE001
            return {}

    def inspect(self, ctx: InspectionContext) -> list[DetectionSignal]:
        matched: list[str] = []
        heuristic = 0.0
        for pattern, weight in _PATTERNS:
            m = pattern.search(ctx.normalized)
            if m:
                matched.append(m.group(0))
                heuristic = max(heuristic, weight)

        # Per-label thresholds (ported from Prompt-Compliance-Automation): a
        # breach is a label whose score exceeds its own calibrated threshold;
        # threat/severe_toxicity breaches hard-block regardless of worst score.
        scores = self._ml_scores(ctx.normalized)
        breaches, hard_block = evaluate_labels(scores) if scores else ([], False)
        ml = max((float(b["score"]) for b in breaches), default=0.0) * 100.0
        if heuristic == 0 and ml < 45:
            return []

        score = max(heuristic, ml)
        message = "Toxic or abusive language detected."
        if breaches:
            detail = ", ".join(f"{b['label']} {b['score']}>{b['threshold']}" for b in breaches)
            message = f"Toxic content exceeds per-label thresholds: {detail}."
            if hard_block:
                message += " Severity-class label breached."
        return [
            self._signal(
                score=score,
                confidence=0.7 if self.upgraded else 0.55,
                message=message,
                matched=matched or ["ml-classified toxicity"],
            )
        ]
