"""The detection pipeline - the heart of Guardian.

Normalizes a message, runs every detector concurrently, fuses their signals
into a verdict, redacts PII when sanitizing, and (optionally) attaches an
LLM-authored explanation. Designed to always return a verdict fast, even with
every optional dependency missing.
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone

from app.engine.aggregator import aggregate
from app.engine.base import Detector
from app.engine.detectors import (
    EncodedPayloadDetector,
    PIIDetector,
    PolicyEngine,
    PromptInjectionDetector,
    SchemaAnomalyDetector,
    ToolPoisoningDetector,
    ToxicityDetector,
)
from app.engine import llm_classifier
from app.engine.llm import explain_verdict, recommended_action
from app.engine.normalizer import normalize
from app.schemas.events import (
    GuardianEvent,
    InspectRequest,
    InspectResponse,
    ThreatCategory,
    Verdict,
)


class GuardianEngine:
    def __init__(self) -> None:
        self.pii = PIIDetector()
        self.detectors: list[Detector] = [
            PromptInjectionDetector(),
            ToolPoisoningDetector(),
            self.pii,
            ToxicityDetector(),
            EncodedPayloadDetector(),
            SchemaAnomalyDetector(),
            PolicyEngine(),
        ]

    # ---- introspection for /api/health -------------------------------------

    def capabilities(self) -> list[dict[str, object]]:
        return [
            {
                "name": d.name,
                "category": d.category.value,
                "tier": d.tier,
                "upgraded": d.upgraded,
            }
            for d in self.detectors
        ]

    def probe_latencies(self) -> dict[str, float]:
        """Run a trivial inspection through each detector and return its
        wall-clock latency in milliseconds.  Used by /api/health to report
        real per-detector timing instead of zeros."""
        from app.engine.normalizer import normalize

        ctx = normalize("health check probe")
        results: dict[str, float] = {}
        for d in self.detectors:
            t0 = time.perf_counter()
            try:
                d.inspect(ctx)
            except Exception:  # noqa: BLE001
                pass
            results[d.name] = round((time.perf_counter() - t0) * 1000, 2)
        return results

    # ---- core --------------------------------------------------------------

    async def inspect(self, req: InspectRequest) -> InspectResponse:
        start = time.perf_counter()
        ctx = normalize(req.content)
        ctx.direction = req.direction
        ctx.tool = req.tool

        signals = []
        for detector in self.detectors:
            try:
                signals.extend(detector.inspect(ctx))
            except Exception:  # noqa: BLE001 - one detector must never break the pipeline
                continue

        result = aggregate(signals)

        # Hybrid tier: when the fast heuristics were inconclusive, escalate to the
        # LLM classifier for a semantic second opinion. Gated on `explain` so the
        # high-volume simulator and offline paths never incur an LLM call. The
        # classifier can only ADD a signal, never lower a heuristic verdict.
        if req.explain and llm_classifier.should_escalate(req.content, result.risk_score):
            llm_signal = await llm_classifier.classify(req.content, req.direction)
            if llm_signal is not None:
                signals.append(llm_signal)
                result = aggregate(signals)

        sanitized: str | None = None
        if result.verdict == Verdict.SANITIZE or result.category == ThreatCategory.PII_LEAKAGE:
            sanitized = self.pii.redact(req.content)

        if req.explain:
            explanation, llm_reasoned = await explain_verdict(
                result.verdict, result.category, result.risk_score, result.signals, req.content
            )
        else:
            from app.engine.llm import deterministic_explanation

            explanation = deterministic_explanation(
                result.verdict, result.category, result.risk_score, result.signals
            )
            llm_reasoned = False

        latency = round((time.perf_counter() - start) * 1000, 1)

        return InspectResponse(
            riskScore=result.risk_score,
            category=result.category,
            verdict=result.verdict,
            severity=result.severity,
            explanation=explanation,
            recommendedAction=recommended_action(result.category),
            signals=result.signals,
            sanitized=sanitized,
            latencyMs=latency,
            llmReasoned=llm_reasoned,
        )

    async def inspect_to_event(self, req: InspectRequest) -> GuardianEvent:
        """Inspect and shape the result as a dashboard `GuardianEvent`."""
        res = await self.inspect(req)
        preview = res.sanitized if res.sanitized else req.content
        event = GuardianEvent(
            id=f"evt_{uuid.uuid4().hex[:10]}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            direction=req.direction,
            source=req.source,
            target=req.target,
            tool=req.tool,
            riskScore=res.riskScore,
            category=res.category,
            verdict=res.verdict,
            severity=res.severity,
            explanation=res.explanation,
            recommendedAction=res.recommendedAction,
            signals=res.signals,
            latencyMs=res.latencyMs,
            preview=preview[:280],
            llmReasoned=res.llmReasoned,
        )
        try:
            from app.engine.correlation import correlator
            await correlator.ingest_event(event)
        except Exception:  # noqa: BLE001
            pass
        return event


# module-level singleton
engine = GuardianEngine()
