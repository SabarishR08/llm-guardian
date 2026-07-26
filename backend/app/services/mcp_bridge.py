"""Bridge to the real, sandboxed filesystem MCP server.

Guardian's backend intentionally does NOT install the `mcp` SDK in its own
virtualenv (it previously pulled a `starlette` version that broke FastAPI).
Instead it shells out to an isolated Python environment
(`mcp-servers/filesystem/.venv`) that owns the real MCP client/server stack,
via a tiny JSON-over-stdio bridge script. Guardian only ever sees plain JSON.
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path

# repo-root/mcp-servers/filesystem
_MCP_DIR = Path(__file__).resolve().parents[3] / "mcp-servers" / "filesystem"
_VENV = _MCP_DIR / ".venv"
_BRIDGE_PYTHON = _VENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
_BRIDGE_SCRIPT = _MCP_DIR / "bridge.py"

TIMEOUT_SECONDS = 15.0


class McpBridgeError(RuntimeError):
    pass


def is_available() -> bool:
    return _BRIDGE_PYTHON.exists() and _BRIDGE_SCRIPT.exists()


async def _run_bridge(command: dict) -> dict:
    if not is_available():
        raise McpBridgeError(
            "The demo MCP filesystem server is not set up "
            "(mcp-servers/filesystem/.venv is missing)."
        )

    proc = await asyncio.create_subprocess_exec(
        str(_BRIDGE_PYTHON),
        str(_BRIDGE_SCRIPT),
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=str(_MCP_DIR),
    )
    try:
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(json.dumps(command).encode("utf-8")),
            timeout=TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError as exc:
        proc.kill()
        raise McpBridgeError("MCP server bridge timed out.") from exc

    if not stdout:
        raise McpBridgeError(f"MCP server bridge produced no output: {stderr.decode(errors='replace')[:300]}")

    try:
        result = json.loads(stdout.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise McpBridgeError(f"MCP server bridge returned invalid JSON: {stdout[:300]!r}") from exc

    if not result.get("ok"):
        raise McpBridgeError(result.get("error", "Unknown MCP bridge error"))
    return result


async def list_tools() -> list[dict]:
    result = await _run_bridge({"action": "list_tools"})
    return result["tools"]


async def call_tool(name: str, arguments: dict) -> tuple[str, bool]:
    """Returns (content_text, is_error)."""
    result = await _run_bridge({"action": "call_tool", "name": name, "arguments": arguments})
    return result["content"], bool(result.get("isError", False))
