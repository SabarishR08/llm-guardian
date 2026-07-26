"""Shared test fixtures.

The LLM classifier (hybrid detection tier) is non-deterministic and depends on
a live Groq call, so it is disabled for the whole test suite - unit tests verify
the deterministic heuristic engine. The classifier has its own dedicated test.
"""

import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def _disable_llm_detection():
    original = settings.llm_detection_enabled
    settings.llm_detection_enabled = False
    yield
    settings.llm_detection_enabled = original
