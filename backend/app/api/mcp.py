"""Live MCP tool-call endpoint.

Calls the real, sandboxed filesystem MCP server and routes its response
through Guardian's actual detection engine before returning it - demonstrating
genuine bidirectional inspection against a real tool, not a canned payload.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.engine.pipeline import engine
from app.schemas.events import InspectRequest
from app.services import mcp_bridge
from app.services.event_store import store
from app.services.ws_manager import manager

router = APIRouter(prefix="/api/mcp", tags=["mcp"])

SERVER_NAME = "filesystem-mcp (sandboxed)"


@router.get("/status")
async def status() -> dict[str, object]:
    return {"available": mcp_bridge.is_available(), "server": SERVER_NAME}


@router.get("/tools")
async def tools() -> dict[str, object]:
    if not mcp_bridge.is_available():
        raise HTTPException(503, "The demo MCP server is not set up.")
    try:
        result = await mcp_bridge.list_tools()
    except mcp_bridge.McpBridgeError as exc:
        raise HTTPException(502, str(exc)) from exc
    return {"server": SERVER_NAME, "tools": result}


@router.post("/call")
async def call(body: dict) -> dict[str, object]:
    """Call a real tool on the sandboxed MCP server, then inspect its response.

    Body: {"name": "read_file", "arguments": {"name": "vendor-config.txt"}}
    """
    name = body.get("name")
    arguments = body.get("arguments", {})
    if not name:
        raise HTTPException(422, "Missing 'name'")

    if not mcp_bridge.is_available():
        raise HTTPException(503, "The demo MCP server is not set up.")

    try:
        content, is_error = await mcp_bridge.call_tool(name, arguments)
    except mcp_bridge.McpBridgeError as exc:
        raise HTTPException(502, str(exc)) from exc

    # The tool's real response flows back through Guardian, outbound (tool -> agent).
    inspect_req = InspectRequest(
        content=content,
        direction="outbound",
        source=SERVER_NAME,
        target="agent:demo-session",
        tool=name,
        explain=False,
    )
    event = await engine.inspect_to_event(inspect_req)
    if event.category.value != "benign":
        await store.add(event)
        await manager.broadcast(event)

    return {
        "tool": name,
        "arguments": arguments,
        "raw_response": content,
        "tool_reported_error": is_error,
        "guardian_verdict": {
            "riskScore": event.riskScore,
            "category": event.category,
            "verdict": event.verdict,
            "severity": event.severity,
            "explanation": event.explanation,
            "recommendedAction": event.recommendedAction,
            "signals": event.signals,
        },
    }
