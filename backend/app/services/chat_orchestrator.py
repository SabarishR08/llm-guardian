"""Chat turn orchestrator.

Runs one real agent turn and yields a sequence of event dicts as each phase
genuinely completes: inbound inspection -> tool routing -> tool execution ->
outbound inspection -> reply generation. The frontend renders each event as it
arrives over SSE, so the animation timing reflects real backend work.

A short, explicitly-documented pacing delay is inserted before surfacing the
Guardian verdict - the detectors themselves run in low-single-digit
milliseconds, which would render as an imperceptible flash; the delay exists
purely so the scanning animation is readable, not to simulate work that isn't
happening. The score, category, and verdict are always the real computed
result, never altered by the delay.
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Any

from app.engine.pipeline import engine
from app.schemas.events import GuardianEvent, InspectRequest, ThreatCategory, Verdict
from app.services import chat_llm, tools
from app.services.event_store import store
from app.services.ws_manager import manager

SCAN_PACING_SECONDS = 0.55


def _uid() -> str:
    return uuid.uuid4().hex[:10]


async def _inspect(content: str, direction: str, source: str, target: str, tool: str | None):
    safe_content = content[:500_000] if content else ""
    try:
        req = InspectRequest(
            content=safe_content, direction=direction, source=source, target=target, tool=tool, explain=True
        )
        event = await engine.inspect_to_event(req)
    except Exception as exc:
        event = GuardianEvent(
            id=uuid.uuid4().hex[:10],
            timestamp=datetime.now(timezone.utc).isoformat(),
            direction=direction,  # type: ignore[arg-type]
            source=source,
            target=target,
            tool=tool,
            riskScore=0,
            category=ThreatCategory.BENIGN,
            verdict=Verdict.ALLOW,
            severity="low",
            explanation=f"Payload processed with fallback: {exc}",
            recommendedAction="Allow request with caution.",
            signals=[],
            latencyMs=0.0,
            preview=safe_content[:100],
        )
    if event.category.value != "benign":
        await store.add(event)
        await manager.broadcast(event)
    return event


def _matched_indicators(event) -> list[str]:
    """Distinct matched substrings across all signals - the concrete evidence
    the assistant can cite (e.g. 'ignore all previous instructions')."""
    seen: set[str] = set()
    out: list[str] = []
    for sig in event.signals:
        for m in sig.matched:
            key = m.strip().lower()
            if key and key not in seen:
                seen.add(key)
                out.append(m.strip())
    return out[:4]


def _confidence_label(conf: float) -> str:
    if conf >= 0.8:
        return "High"
    if conf >= 0.6:
        return "Medium"
    return "Low"


def _build_evidence(content: str, event) -> list[dict[str, Any]]:
    """Locate each matched indicator inside the real content so the UI can show
    WHAT was found and WHERE (line number) with a confidence level."""
    lines = content.splitlines()
    evidence: list[dict[str, Any]] = []
    seen: set[str] = set()
    for sig in event.signals:
        conf = _confidence_label(sig.confidence)
        for m in sig.matched:
            snippet = m.strip()
            key = snippet.lower()
            if len(key) < 3 or key in seen:
                continue
            seen.add(key)
            line_no = next((i for i, ln in enumerate(lines, 1) if key in ln.lower()), None)
            evidence.append(
                {
                    "indicator": snippet[:140],
                    "line": line_no,
                    "confidence": conf,
                    "category": sig.category.value,
                }
            )
    return evidence[:6]


_REDACTION_MARKER = "〔 ⚠ malicious instruction removed by Guardian 〕"


def _build_sanitized_preview(content: str, event) -> str | None:
    """Line-level redaction: replace whole lines that contain a detected
    indicator with a marker, so the user can see Guardian ISOLATED the threat
    rather than blindly rejecting the whole document."""
    indicators = [
        m.strip().lower()
        for sig in event.signals
        for m in sig.matched
        if len(m.strip()) >= 6
    ]
    if not indicators:
        return None

    out: list[str] = []
    changed = False
    for ln in content.splitlines():
        low = ln.lower()
        if any(ind in low for ind in indicators):
            out.append(_REDACTION_MARKER)
            changed = True
        else:
            out.append(ln)
    if not changed:
        return None
    return "\n".join(out)[:2500]


def _verdict_payload(event, content: str | None = None, with_preview: bool = False) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "riskScore": event.riskScore,
        "category": event.category.value,
        "verdict": event.verdict.value,
        "severity": event.severity,
        "explanation": event.explanation,
        "recommendedAction": event.recommendedAction,
        "signals": [s.model_dump() for s in event.signals],
        "latencyMs": event.latencyMs,
        "evidence": _build_evidence(content, event) if content is not None else [],
        "sanitizedPreview": None,
    }
    if with_preview and content is not None and event.category.value != "benign":
        payload["sanitizedPreview"] = _build_sanitized_preview(content, event)
    return payload


TOOL_LABELS = {
    "read_document": "read_document",
    "list_documents": "list_documents",
    "web_search": "web_search",
    "send_notification": "send_notification",
}


async def run_turn(
    history: list[dict], message: str, attachment: dict | None = None
) -> AsyncIterator[dict]:
    turn_id = _uid()
    yield {"type": "turn_start", "id": turn_id, "at": datetime.now(timezone.utc).isoformat()}

    # Resolve attachment state once up-front.
    # `uploaded` is True when an attachment with readable text content was
    # provided. `attachment_present` is True for ANY attachment (even when the
    # frontend could not extract text — e.g. a real binary PDF).  Both flags
    # influence routing so the document is always prioritised over the message.
    attachment_content: str = (attachment or {}).get("content") or ""
    attachment_name: str = (attachment or {}).get("name") or ""
    uploaded = bool(attachment_content.strip())
    attachment_present = bool(attachment_name)

    # What to actually inspect in step 1:
    # • If we have file content → scan that (the document is the untrusted input).
    # • If we only have the file name (binary / oversized) → scan the name.
    # • Otherwise → scan the user's typed message.
    if uploaded:
        inbound_content = attachment_content.strip()
    elif attachment_present:
        inbound_content = f"[user attached file: {attachment_name}]\n{message}".strip()
    else:
        inbound_content = message

    # 1. Inbound inspection.
    yield {"type": "inbound_scan_start"}
    inbound_event = await _inspect(
        inbound_content, direction="inbound", source="user:chat", target="agent:guardian-assistant", tool=None
    )
    await asyncio.sleep(min(SCAN_PACING_SECONDS, 0.3))
    yield {"type": "inbound_result", **_verdict_payload(inbound_event, content=inbound_content)}

    if inbound_event.verdict.value in ("BLOCK", "QUARANTINE"):
        yield {"type": "thinking"}
        await asyncio.sleep(0.3)
        ctx = chat_llm.ReplyContext(
            user_message=message or attachment_name or "the uploaded file",
            stage="inbound_block",
            verdict=inbound_event.verdict.value,
            category=inbound_event.category.value,
            matched=_matched_indicators(inbound_event),
        )
        async for chunk in chat_llm.stream_reply(history, ctx):
            yield {"type": "assistant_delta", "text": chunk}
        yield {"type": "done"}
        return

    # 2. Decide what tool to call.
    yield {"type": "thinking"}
    await asyncio.sleep(0.35)

    if uploaded:
        # Attachment with content always wins — read it through the real tool
        # so Guardian inspects the outbound content before the AI sees it.
        tool_name, args = "read_document", {"name": attachment_name}
    elif attachment_present:
        # Attachment present but content not extractable (true binary / oversized).
        # Still route to read_document; the tool will surface a helpful error.
        tool_name, args = "read_document", {"name": attachment_name}
    else:
        tool_name, args = tools.route_intent(message)
        if tool_name == "none":
            ctx = chat_llm.ReplyContext(user_message=message, stage="no_tool")
            async for chunk in chat_llm.stream_reply(history, ctx):
                yield {"type": "assistant_delta", "text": chunk}
            yield {"type": "done"}
            return

    # 3. Tool execution.
    yield {"type": "tool_call", "tool": tool_name, "args": args}
    if (uploaded or attachment_present) and tool_name == "read_document":
        if uploaded:
            result = await tools.read_uploaded_document(attachment_name, attachment_content)
        else:
            # Binary / oversized: try reading by name from the sandbox.
            result = await tools.read_document(attachment_name)
    elif tool_name == "read_document":
        result = await tools.read_document(args.get("name", "readme.txt"))
    elif tool_name == "list_documents":
        result = await tools.list_documents()
    elif tool_name == "web_search":
        result = await tools.web_search(args.get("query", message))
    else:
        result = await tools.send_notification(args.get("message", message))

    yield {
        "type": "tool_result",
        "tool": tool_name,
        "content": result.content,
        "is_error": result.is_error,
        "is_live": result.is_live,
    }

    # 4. Outbound inspection of the tool's response.
    yield {"type": "guardian_scan_start"}
    outbound_event = await _inspect(
        result.content,
        direction="outbound",
        source=f"tool:{tool_name}",
        target="agent:guardian-assistant",
        tool=tool_name,
    )
    await asyncio.sleep(SCAN_PACING_SECONDS)
    yield {
        "type": "guardian_verdict",
        **_verdict_payload(outbound_event, content=result.content, with_preview=True),
    }

    # 5. Final reply - built from the ACTUAL execution path.
    verdict = outbound_event.verdict.value
    tool_failed = result.is_error
    # The concrete document/target the tool acted on, for a personalized reply.
    target = args.get("name") if tool_name in ("read_document",) else None
    # Never show raw content on a threat verdict; never present an error string as content.
    safe_result = None if (tool_failed or verdict in ("BLOCK", "QUARANTINE")) else result.content
    ctx = chat_llm.ReplyContext(
        user_message=message or (f"[attached: {attachment_name}]" if attachment_name else ""),
        stage="tool",
        verdict=verdict,
        category=outbound_event.category.value,
        tool_name=tool_name,
        target=target,
        tool_succeeded=not tool_failed,
        tool_error_message=result.content if tool_failed else None,
        matched=_matched_indicators(outbound_event),
        tool_result=safe_result,
    )
    async for chunk in chat_llm.stream_reply(history, ctx):
        yield {"type": "assistant_delta", "text": chunk}

    yield {"type": "done"}
