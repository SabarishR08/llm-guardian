"""Tests for Multi-Tool Attack Chain Detection Engine (RH-0045 Challenge Feature)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.engine.correlation import correlator, MultiToolAttackChainEngine, AttackChain
from app.schemas.events import GuardianEvent, ThreatCategory, Verdict


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_attack_chains_api_list(client):
    res = client.get("/api/attack-chains")
    assert res.status_code == 200
    data = res.json()
    assert "challenge" in data
    assert data["challenge"]["teamId"] == "RH-0045"
    assert data["challenge"]["teamName"] == "Mutex"
    assert data["totalChains"] >= 1
    assert len(data["chains"]) >= 1


def test_attack_chains_api_simulate(client):
    res = client.post("/api/attack-chains/simulate")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "chain" in data
    assert data["eventsInjected"] == 3
    chain = data["chain"]
    assert chain["sessionId"] == "session-judge-demo"
    assert len(chain["hops"]) == 3


def test_attack_chains_api_get_single(client):
    res = client.get("/api/attack-chains")
    chains = res.json()["chains"]
    chain_id = chains[0]["id"]

    res_single = client.get(f"/api/attack-chains/{chain_id}")
    assert res_single.status_code == 200
    assert res_single.json()["id"] == chain_id


def test_attack_chains_single_not_found(client):
    res = client.get("/api/attack-chains/nonexistent-chain-id")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_correlator_engine_multi_tool_detection():
    engine = MultiToolAttackChainEngine()
    
    evt1 = GuardianEvent(
        id="evt1",
        timestamp="2026-07-25T00:00:00Z",
        direction="outbound",
        source="agent-test",
        target="filesystem-mcp",
        tool="read_file",
        riskScore=60.0,
        category=ThreatCategory.ENCODED_PAYLOAD,
        verdict=Verdict.QUARANTINE,
        severity="high",
        explanation="Encoded payload detected",
        recommendedAction="Quarantine",
        signals=[],
        latencyMs=0.1,
        preview="test",
    )
    
    evt2 = GuardianEvent(
        id="evt2",
        timestamp="2026-07-25T00:00:05Z",
        direction="outbound",
        source="agent-test",
        target="vault-mcp",
        tool="get_secret",
        riskScore=95.0,
        category=ThreatCategory.PROMPT_INJECTION,
        verdict=Verdict.BLOCK,
        severity="critical",
        explanation="Prompt injection detected",
        recommendedAction="Block",
        signals=[],
        latencyMs=0.1,
        preview="test",
    )

    # First event alone shouldn't trigger a multi-tool chain
    chain1 = await engine.ingest_event(evt1)
    assert chain1 is None

    # Second event across tools should trigger a correlated AttackChain
    chain2 = await engine.ingest_event(evt2)
    assert chain2 is not None
    assert chain2.session_id == "agent-test"
    assert len(chain2.hops) == 2
    assert chain2.pattern_type == "MULTI_TOOL_CORRELATED_ATTACK"
