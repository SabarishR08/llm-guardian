"""Chat reply generation.

ARCHITECTURAL RULE: the assistant reply is ALWAYS derived from the real
pipeline state (`ReplyContext`) - never generic fallback text. The reply must
describe the actual execution path and never conflate distinct states:

  - Tool FAILED (not found / denied / timeout / MCP down) → "could not access".
  - Tool SUCCEEDED but Guardian BLOCKED the output → the tool DID read the
    content; Guardian blocked the RESPONSE after inspection. Never imply the
    resource was inaccessible.
  - Inbound message blocked → the user's own message was flagged; no tool ran.

Streams a real Groq completion when a key is configured (the model is briefed
with the exact pipeline facts and must describe them accurately); otherwise a
deterministic reply is composed from the same facts.
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from dataclasses import dataclass, field

import httpx

from app.core.config import settings

_CATEGORY_LABEL = {
    "prompt_injection": "prompt injection",
    "tool_poisoning": "tool poisoning",
    "pii_leakage": "PII / secret leakage",
    "toxicity": "toxic or abusive content",
    "policy_violation": "a policy violation",
    "encoded_payload": "an encoded payload",
    "schema_anomaly": "a schema anomaly",
    "benign": "a potential threat",
}


@dataclass
class ReplyContext:
    """The real pipeline state the reply must describe."""

    user_message: str
    stage: str  # "no_tool" | "inbound_block" | "tool"
    verdict: str | None = None  # ALLOW | SANITIZE | QUARANTINE | BLOCK
    category: str | None = None  # threat category value
    tool_name: str | None = None
    target: str | None = None  # the document/resource the tool acted on
    tool_succeeded: bool = True
    tool_error_message: str | None = None  # set when tool_succeeded is False
    matched: list[str] = field(default_factory=list)  # detected threat indicators
    tool_result: str | None = None  # safe content to show (ALLOW / SANITIZE only)


_SYSTEM_PROMPT = (
    "You are the AI assistant inside MCP Guardian, a security firewall that inspects "
    "every message and tool response. Respond naturally, 2-5 sentences.\n\n"
    "CRITICAL ACCURACY RULES - always describe the ACTUAL execution path from the "
    "PIPELINE FACTS you are given, and never conflate distinct states:\n"
    "1. If a tool FAILED (not found, denied, timeout, unavailable): say the resource "
    "could not be accessed. Do NOT claim a security threat.\n"
    "2. If a tool EXECUTED SUCCESSFULLY but Guardian BLOCKED or QUARANTINED its output: "
    "make it clear the tool DID successfully read/return the content, and Guardian "
    "blocked the RESPONSE after inspecting it. NEVER imply the file was inaccessible or "
    "'couldn't be shared'. State the threat type, why it was blocked, and that the AI "
    "never consumed the malicious content and no protected data was exposed.\n"
    "3. If the USER'S OWN message was blocked: explain their message was flagged before "
    "reaching the AI; no tool was involved.\n"
    "4. If allowed: use the result to answer directly.\n"
    "Never invent facts beyond what the PIPELINE FACTS state."
)


def is_llm_available() -> bool:
    return bool(settings.groq_api_key)


def _humanize_tool(name: str | None) -> str:
    return (name or "the tool").replace("_", " ")


def _indicator_clause(matched: list[str]) -> str:
    quoted = [f'"{m.strip()}"' for m in matched[:2] if m and m.strip()]
    if not quoted:
        return ""
    if len(quoted) == 1:
        return f", including the instruction {quoted[0]}"
    return f", including {quoted[0]} and {quoted[1]}"


# ----------------------------------------------------------------------------
# Streaming entrypoint
# ----------------------------------------------------------------------------

async def stream_reply(history: list[dict], ctx: ReplyContext) -> AsyncIterator[str]:
    if is_llm_available():
        async for chunk in _stream_groq(history, ctx):
            yield chunk
        return
    for word in compose_deterministic_reply(ctx).split(" "):
        yield word + " "
        await asyncio.sleep(0.016)


def _state_briefing(ctx: ReplyContext) -> str:
    label = _CATEGORY_LABEL.get(ctx.category or "", "a threat")
    matched = "; ".join(m.strip() for m in ctx.matched[:4] if m and m.strip()) or "none recorded"

    if ctx.stage == "no_tool":
        return ""

    if ctx.stage == "inbound_block":
        return (
            "\n\n[PIPELINE FACTS - describe accurately:\n"
            "- No tool was called.\n"
            f"- Guardian inspected the USER'S message and returned verdict {ctx.verdict} "
            f"(threat: {label}).\n"
            f"- Detected indicators: {matched}.\n"
            "- The message was blocked before the AI processed it.\n"
            "Explain that the user's own message was flagged and blocked; no tool ran.]"
        )

    # stage == "tool"
    if not ctx.tool_succeeded:
        return (
            "\n\n[PIPELINE FACTS:\n"
            f"- The {ctx.tool_name} tool FAILED to execute. Error: {ctx.tool_error_message}.\n"
            "- No usable output was produced.\n"
            "Tell the user the resource could not be accessed. Do NOT claim a security "
            "threat or that anything was blocked for safety.]"
        )

    doc = f" the document '{ctx.target}'" if ctx.target else " the content"
    if ctx.verdict in ("BLOCK", "QUARANTINE"):
        action = "blocked" if ctx.verdict == "BLOCK" else "quarantined for review"
        return (
            "\n\n[PIPELINE FACTS - describe accurately, NEVER imply the tool failed:\n"
            f"- The {ctx.tool_name} tool EXECUTED SUCCESSFULLY and read{doc}, returning its content.\n"
            f"- Guardian then INSPECTED that output and returned verdict {ctx.verdict}.\n"
            f"- Threat type: {label}.\n"
            f"- Detected indicators (you may quote these): {matched}.\n"
            f"- Guardian {action} the tool RESPONSE before the model consumed it. The AI "
            "never processed the content; no protected data was exposed.\n"
            f"Start by naming the document{f' ({ctx.target})' if ctx.target else ''}. Explain: "
            "the tool succeeded and read it, Guardian inspected the output, the threat type "
            "(quote an indicator), why it was blocked, and that the AI never consumed it.]"
        )

    # ALLOW / SANITIZE - safe to answer with the content
    return (
        f"\n\n[PIPELINE FACTS: The {ctx.tool_name} tool succeeded and Guardian cleared it "
        f"(verdict {ctx.verdict}). Result:\n{(ctx.tool_result or '')[:1500]}]"
    )


async def _stream_groq(history: list[dict], ctx: ReplyContext) -> AsyncIterator[str]:
    messages = [{"role": "system", "content": _SYSTEM_PROMPT}]
    for h in history[-8:]:
        role = "assistant" if h.get("role") == "assistant" else "user"
        messages.append({"role": role, "content": h.get("content", "")[:2000]})
    messages.append({"role": "user", "content": ctx.user_message + _state_briefing(ctx)})

    try:
        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            async with client.stream(
                "POST",
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": settings.groq_model,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 400,
                    "stream": True,
                },
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    payload = line[len("data: ") :]
                    if payload.strip() == "[DONE]":
                        break
                    try:
                        delta = json.loads(payload)["choices"][0]["delta"].get("content")
                    except (KeyError, IndexError, json.JSONDecodeError):
                        continue
                    if delta:
                        yield delta
        return
    except Exception:  # noqa: BLE001 - fall through to deterministic reply
        for word in compose_deterministic_reply(ctx).split(" "):
            yield word + " "
            await asyncio.sleep(0.016)


# ----------------------------------------------------------------------------
# Deterministic reply - same facts, no LLM
# ----------------------------------------------------------------------------

def compose_deterministic_reply(ctx: ReplyContext) -> str:
    label = _CATEGORY_LABEL.get(ctx.category or "", "a security threat")
    indicators = _indicator_clause(ctx.matched)

    if ctx.stage == "no_tool":
        return (
            "Hi! I'm the Guardian assistant. Ask me to read a document, search for "
            "something, or send a notification - every request and every tool response "
            "is inspected by Guardian in real time before it reaches the model."
        )

    if ctx.stage == "inbound_block":
        if ctx.verdict == "QUARANTINE":
            return (
                f"Guardian inspected your message and flagged {label}{indicators}. It was "
                "held for review rather than passed to the AI, so the model has not "
                "processed it."
            )
        return (
            f"Guardian inspected your message and detected {label}{indicators}. It was "
            "blocked before reaching the AI, so the model never processed it."
        )

    # stage == "tool"
    tool = _humanize_tool(ctx.tool_name)
    doc = f"`{ctx.target}`" if ctx.target else "the document"

    if not ctx.tool_succeeded:
        detail = (ctx.tool_error_message or "").strip()
        detail = f" ({detail})" if detail else ""
        target_phrase = f" {doc}" if ctx.target else " that resource"
        return (
            f"The {tool} tool couldn't access{target_phrase}{detail}. Since no content was "
            "returned, there was nothing for Guardian to inspect. Try a different document "
            "or check that it exists."
        )

    if ctx.verdict == "BLOCK":
        return (
            f"Guardian blocked {doc} after a **successful** security inspection.\n\n"
            f"The `{ctx.tool_name}` tool executed successfully and returned the contents of "
            f"{doc}. During inspection, Guardian detected **{label}**{indicators}. To prevent "
            "these instructions from influencing the AI, Guardian blocked the tool response "
            "before it reached the model. No protected information was exposed, and the AI "
            "did not consume the malicious content."
        )

    if ctx.verdict == "QUARANTINE":
        return (
            f"The `{ctx.tool_name}` tool successfully read {doc} and returned a response, but "
            f"Guardian flagged **{label}**{indicators} and quarantined it for human review "
            "instead of passing it to the model. The AI has not consumed the content."
        )

    if ctx.verdict == "SANITIZE":
        result = (ctx.tool_result or "").strip()
        return (
            f"The `{ctx.tool_name}` tool succeeded, and Guardian redacted sensitive content "
            f"before the AI saw it. Here's the sanitized result:\n\n{result[:1200]}"
        )

    # ALLOW
    result = (ctx.tool_result or "").strip()
    if not result:
        return f"The `{ctx.tool_name}` tool succeeded and Guardian cleared the response, but it came back empty."
    return f"Here's what I found:\n\n{result[:1500]}"
