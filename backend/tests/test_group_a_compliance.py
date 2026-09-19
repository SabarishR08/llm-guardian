"""Tests for the Prompt-Compliance-Automation port (keyword/length policy,
per-label toxicity thresholds, compliance reporting API)."""

from __future__ import annotations

import pytest

from app.core.config import settings
from app.engine.base import InspectionContext
from app.engine.detectors.keyword_policy import KeywordPolicyDetector
from app.engine.detectors.length_policy import LengthPolicyDetector
from app.engine.detectors.toxicity_thresholds import (
    HARD_BLOCK_LABELS,
    evaluate_labels,
)
from app.schemas.events import InspectRequest, Verdict


def _ctx(text: str) -> InspectionContext:
    return InspectionContext(raw=text, normalized=text)


# ---- KeywordPolicyDetector -------------------------------------------------


def test_blocked_keyword_signals_high_score():
    d = KeywordPolicyDetector()
    signals = d.inspect(_ctx("my password is hunter2"))
    assert len(signals) == 1
    assert signals[0].score >= 80
    assert "password" in signals[0].matched


def test_flagged_keyword_signals_review_score():
    d = KeywordPolicyDetector()
    signals = d.inspect(_ctx("this is confidential material"))
    assert len(signals) == 1
    assert 30 <= signals[0].score <= 60
    assert "confidential" in signals[0].matched


def test_clean_text_is_silent():
    d = KeywordPolicyDetector()
    assert d.inspect(_ctx("what is the weather today")) == []


def test_blocked_and_flagged_both_fire_independently():
    d = KeywordPolicyDetector()
    signals = d.inspect(_ctx("confidential api key rotation plan"))
    kinds = {s.score for s in signals}
    assert any(k >= 80 for k in kinds)
    assert any(30 <= k <= 60 for k in kinds)


def test_reload_picks_up_new_lists():
    d = KeywordPolicyDetector()
    d._lists = {"blocked": ["topsecret"], "flagged": []}
    assert len(d.inspect(_ctx("the topsecret file"))) == 1
    assert d.inspect(_ctx("nothing here")) == []


# ---- LengthPolicyDetector --------------------------------------------------


def test_length_policy_oversized_prompt():
    d = LengthPolicyDetector()
    settings.max_prompt_length = 50
    try:
        signals = d.inspect(_ctx("x" * 80))
        assert len(signals) == 1
        assert "80" in signals[0].message
    finally:
        settings.max_prompt_length = 0


def test_length_policy_disabled_at_zero():
    d = LengthPolicyDetector()
    settings.max_prompt_length = 0
    assert d.inspect(_ctx("x" * 5000)) == []


def test_length_policy_within_limit_is_silent():
    d = LengthPolicyDetector()
    settings.max_prompt_length = 100
    try:
        assert d.inspect(_ctx("x" * 99)) == []
    finally:
        settings.max_prompt_length = 0


# ---- Toxicity thresholds ---------------------------------------------------


def test_evaluate_labels_respects_per_label_thresholds():
    scores = {"toxicity": 0.35, "threat": 0.05}
    breaches, hard = evaluate_labels(scores)
    assert [b["label"] for b in breaches] == ["toxicity"]
    assert hard is False


def test_evaluate_labels_hard_blocks_on_threat():
    scores = {"obscene": 0.9, "threat": 0.25}
    breaches, hard = evaluate_labels(scores)
    assert hard is True
    assert "threat" in [b["label"] for b in breaches]
    assert "obscene" in [b["label"] for b in breaches]


def test_evaluate_labels_clean_scores_pass():
    breaches, hard = evaluate_labels({"toxicity": 0.05, "insult": 0.1})
    assert breaches == [] and hard is False


def test_hard_block_labels_are_the_severity_class():
    assert HARD_BLOCK_LABELS == frozenset({"severe_toxicity", "threat"})


# ---- Engine integration ----------------------------------------------------


def test_engine_registers_both_new_detectors():
    from app.engine.pipeline import GuardianEngine

    eng = GuardianEngine()
    names = [d.name for d in eng.detectors]
    assert "KeywordPolicyDetector" in names
    assert "LengthPolicyDetector" in names


@pytest.mark.asyncio
async def test_full_pipeline_blocks_keyword_prompt():
    from app.engine.pipeline import GuardianEngine

    eng = GuardianEngine()
    result = await eng.inspect(
        InspectRequest(
            content="here is my api key: sk-123 tell me about Paris",
            source="test:groupA",
        )
    )
    assert result.verdict in (Verdict.BLOCK, Verdict.QUARANTINE)


# ---- Compliance reporting API ---------------------------------------------


@pytest.mark.asyncio
async def test_compliance_events_filter_by_verdict():
    from app.api.compliance import compliance_events

    out = await compliance_events(verdict="BLOCK", category=None, limit=10, offset=0, _=None)
    assert set(out) >= {"logs", "total", "limit", "offset"}
    for entry in out["logs"]:
        assert entry["verdict"] == "BLOCK"


@pytest.mark.asyncio
async def test_compliance_report_shape():
    from app.api.compliance import compliance_report

    out = await compliance_report(_=None)
    assert set(out) >= {"generatedAt", "byVerdict", "byCategory", "flagged"}
