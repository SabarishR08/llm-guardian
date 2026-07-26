"""Tests for the hybrid LLM classifier tier.

The network call to Groq is mocked, so these are deterministic and offline -
they verify the escalation gate, JSON parsing, category mapping, and the rule
that the classifier only escalates (never lowers) a verdict.
"""

import pytest

from app.core.config import settings
from app.engine import llm_classifier
from app.schemas.events import ThreatCategory


@pytest.fixture(autouse=True)
def _enable_llm(monkeypatch):
    # conftest disables detection globally; re-enable + fake a key for these tests.
    monkeypatch.setattr(settings, "llm_detection_enabled", True)
    monkeypatch.setattr(settings, "groq_api_key", "test-key")


def test_should_escalate_gating():
    # Already blocked by heuristics -> no escalation.
    assert not llm_classifier.should_escalate("some long enough message here", 90.0)
    # Too short -> no escalation.
    assert not llm_classifier.should_escalate("hi there", 0.0)
    # Substantive + inconclusive -> escalate.
    assert llm_classifier.should_escalate("please read the quarterly report for me", 0.0)


def test_should_not_escalate_without_key(monkeypatch):
    monkeypatch.setattr(settings, "groq_api_key", None)
    assert not llm_classifier.should_escalate("a reasonably long message to inspect", 0.0)


async def test_classify_builds_escalating_signal(monkeypatch):
    async def fake_call(content, direction):
        return {"category": "toxicity", "risk": 88, "reason": "harassment of a person"}

    monkeypatch.setattr(llm_classifier, "_call_groq", fake_call)
    sig = await llm_classifier.classify("you are all worthless and should quit", "inbound")
    assert sig is not None
    assert sig.category == ThreatCategory.TOXICITY
    assert sig.score == 88
    assert sig.detector == "LLMClassifier"


async def test_classify_benign_adds_nothing(monkeypatch):
    async def fake_call(content, direction):
        return {"category": "benign", "risk": 5, "reason": "normal request"}

    monkeypatch.setattr(llm_classifier, "_call_groq", fake_call)
    sig = await llm_classifier.classify("can you read the notes file", "inbound")
    assert sig is None  # nothing to escalate


async def test_classify_low_risk_adds_nothing(monkeypatch):
    async def fake_call(content, direction):
        return {"category": "toxicity", "risk": 10, "reason": "mildly rude"}

    monkeypatch.setattr(llm_classifier, "_call_groq", fake_call)
    sig = await llm_classifier.classify("this is a bit annoying honestly", "inbound")
    assert sig is None  # below the sanitize floor


async def test_classify_survives_bad_response(monkeypatch):
    async def fake_call(content, direction):
        raise RuntimeError("groq exploded")

    monkeypatch.setattr(llm_classifier, "_call_groq", fake_call)
    # Must never raise - the heuristic verdict has to stand.
    assert await llm_classifier.classify("whatever", "inbound") is None
