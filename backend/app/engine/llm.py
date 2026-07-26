"""LLM explanation layer.

Generates a concise, human-readable rationale for a verdict. Tries Groq (fast,
hosted) → Ollama (local) → a deterministic template. A verdict is *never*
blocked on the LLM: any failure or timeout falls through to the template.
"""

from __future__ import annotations

import asyncio

import httpx

from app.core.config import settings
from app.schemas.events import DetectionSignal, ThreatCategory, Verdict

_ACTIONS: dict[ThreatCategory, str] = {
    ThreatCategory.PROMPT_INJECTION: "Block the request and flag the originating session.",
    ThreatCategory.TOOL_POISONING: "Quarantine the tool and re-verify its manifest.",
    ThreatCategory.PII_LEAKAGE: "Redact detected identifiers before forwarding.",
    ThreatCategory.TOXICITY: "Sanitize or block depending on severity policy.",
    ThreatCategory.POLICY_VIOLATION: "Hold for review by a human operator.",
    ThreatCategory.ENCODED_PAYLOAD: "Decode, re-scan, and block if intent is malicious.",
    ThreatCategory.SCHEMA_ANOMALY: "Reject the response and request a conforming payload.",
    ThreatCategory.BENIGN: "Forward without modification.",
}

_SYSTEM_PROMPT = (
    "You are MCP Guardian's security analyst. Given a verdict and detector "
    "signals for a message flowing between an AI agent and a tool, write ONE "
    "concise sentence (max 32 words) explaining WHY this verdict was reached. "
    "Be specific and technical. Do not add caveats or restate the verdict label."
)


def recommended_action(category: ThreatCategory) -> str:
    return _ACTIONS.get(category, _ACTIONS[ThreatCategory.BENIGN])


def deterministic_explanation(
    verdict: Verdict, category: ThreatCategory, score: float, signals: list[DetectionSignal]
) -> str:
    if not signals or category == ThreatCategory.BENIGN:
        return "No threat indicators found across the seven detectors - clean operational traffic."
    primary = signals[0]
    extra = len(signals) - 1
    corrob = (
        f" {extra} additional signal{'s' if extra > 1 else ''} corroborated the assessment."
        if extra > 0
        else ""
    )
    return f"{primary.message} Risk scored {score:.0f}/100.{corrob}".strip()


class LLMExplainer:
    def __init__(self) -> None:
        self.provider = self._select_provider()

    def _select_provider(self) -> str:
        if settings.groq_api_key:
            return "groq"
        if settings.ollama_url:
            return "ollama"
        return "deterministic"

    async def explain(
        self,
        verdict: Verdict,
        category: ThreatCategory,
        score: float,
        signals: list[DetectionSignal],
        preview: str,
    ) -> tuple[str, bool]:
        """Return (explanation, llm_reasoned)."""
        if category == ThreatCategory.BENIGN or not signals:
            return deterministic_explanation(verdict, category, score, signals), False

        prompt = (
            f"Verdict: {verdict.value}\nCategory: {category.value}\nRisk: {score:.0f}/100\n"
            f"Signals: {'; '.join(s.message for s in signals[:3])}\n"
            f"Content preview: {preview[:280]}"
        )

        try:
            if self.provider == "groq":
                text = await self._groq(prompt)
            elif self.provider == "ollama":
                text = await self._ollama(prompt)
            else:
                text = None
        except Exception:  # noqa: BLE001 - never block a verdict
            text = None

        if text:
            return text.strip().strip('"'), True
        return deterministic_explanation(verdict, category, score, signals), False

    async def _groq(self, prompt: str) -> str | None:
        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": settings.groq_model,
                    "messages": [
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.2,
                    "max_tokens": 80,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    async def _ollama(self, prompt: str) -> str | None:
        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            resp = await client.post(
                f"{settings.ollama_url}/api/generate",
                json={
                    "model": settings.ollama_model,
                    "system": _SYSTEM_PROMPT,
                    "prompt": prompt,
                    "stream": False,
                },
            )
            resp.raise_for_status()
            return resp.json().get("response")


# module-level singleton
explainer = LLMExplainer()


async def explain_verdict(
    verdict: Verdict, category: ThreatCategory, score: float, signals: list[DetectionSignal], preview: str
) -> tuple[str, bool]:
    return await asyncio.wait_for(
        explainer.explain(verdict, category, score, signals, preview),
        timeout=settings.llm_timeout_seconds + 1,
    )
