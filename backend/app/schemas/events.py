"""Core domain schemas - kept in lock-step with the dashboard's `src/lib/types.ts`."""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class Verdict(str, Enum):
    ALLOW = "ALLOW"
    SANITIZE = "SANITIZE"
    QUARANTINE = "QUARANTINE"
    BLOCK = "BLOCK"


class ThreatCategory(str, Enum):
    PROMPT_INJECTION = "prompt_injection"
    TOOL_POISONING = "tool_poisoning"
    PII_LEAKAGE = "pii_leakage"
    TOXICITY = "toxicity"
    POLICY_VIOLATION = "policy_violation"
    ENCODED_PAYLOAD = "encoded_payload"
    SCHEMA_ANOMALY = "schema_anomaly"
    BENIGN = "benign"


Severity = Literal["low", "medium", "high", "critical"]
Direction = Literal["inbound", "outbound"]


class DetectionSignal(BaseModel):
    detector: str
    category: ThreatCategory
    score: float = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    matched: list[str] = []
    message: str


class GuardianEvent(BaseModel):
    id: str
    timestamp: str
    direction: Direction
    source: str
    target: str
    tool: str | None = None
    riskScore: float = Field(ge=0, le=100)
    category: ThreatCategory
    verdict: Verdict
    severity: Severity
    explanation: str
    recommendedAction: str
    signals: list[DetectionSignal] = []
    latencyMs: float
    preview: str
    llmReasoned: bool = False


class InspectRequest(BaseModel):
    content: str = Field(min_length=0, max_length=500_000)
    direction: Direction = "inbound"
    source: str = "user:anonymous"
    target: str = "agent:default"
    tool: str | None = None
    explain: bool = True


class InspectResponse(BaseModel):
    riskScore: float
    category: ThreatCategory
    verdict: Verdict
    severity: Severity
    explanation: str
    recommendedAction: str
    signals: list[DetectionSignal]
    sanitized: str | None = None
    latencyMs: float
    llmReasoned: bool


class StatsResponse(BaseModel):
    inspected: int
    blocked: int
    quarantined: int
    sanitized: int
    threatsToday: int
    avgRiskScore: float
    avgLatencyMs: float
    activeAgents: int
    connectedServers: int
    blockRate: float
