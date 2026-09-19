"""Per-label toxicity threshold evaluation (ported from Prompt-Compliance-Automation).

Detoxify returns a score per toxicity label (toxicity, severe_toxicity,
obscene, threat, insult, identity_attack). PCA's insight was that the labels
carry very different risk: "threat" at 0.25 is more dangerous than "obscene"
at 0.9. This module applies per-label thresholds to the raw label scores so
the engine can act on the *kind* of toxicity, not just the worst score.

`evaluate_labels` is intentionally dependency-free so tests can exercise it
without loading the (heavy, optional) Detoxify model.
"""

from __future__ import annotations

DEFAULT_THRESHOLDS: dict[str, float] = {
    "toxicity": 0.30,
    "severe_toxicity": 0.20,
    "obscene": 0.30,
    "threat": 0.20,
    "insult": 0.30,
    "identity_attack": 0.20,
}

# Labels that constitute an outright block when their threshold is exceeded.
HARD_BLOCK_LABELS: frozenset[str] = frozenset({"severe_toxicity", "threat"})

# Ops-tunable: GUARDIAN_TOXICITY_THRESHOLDS='{"threat": 0.1, ...}'
THRESHOLDS: dict[str, float] = dict(DEFAULT_THRESHOLDS)


def evaluate_labels(
    scores: dict[str, float],
    thresholds: dict[str, float] | None = None,
) -> tuple[list[dict[str, str]], bool]:
    """Return (breaches, hard_block) for a Detoxify-style score dict.

    A breach is any label whose score exceeds its threshold. `hard_block` is
    True when any breached label is in HARD_BLOCK_LABELS.
    """

    t = thresholds if thresholds is not None else THRESHOLDS
    breaches: list[dict[str, str]] = []
    hard_block = False
    for label, score in scores.items():
        threshold = t.get(label)
        if threshold is not None and score > threshold:
            breaches.append(
                {"label": label, "score": f"{score:.2f}", "threshold": f"{threshold:.2f}"}
            )
            if label in HARD_BLOCK_LABELS:
                hard_block = True
    return breaches, hard_block
