"""Stdio JSON bridge for the sandboxed filesystem MCP server.

Lets a process in a *different* Python environment (Guardian's backend) drive
a real MCP client session without needing the `mcp` package installed itself.
Reads one JSON command from stdin, speaks the real MCP protocol to server.py
as a child process, and writes one JSON result to stdout.

Commands:
  {"action": "list_tools"}
  {"action": "call_tool", "name": "read_file", "arguments": {"name": "readme.txt"}}
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

HERE = Path(__file__).resolve().parent
PYTHON = str(HERE / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python"))
SERVER = str(HERE / "server.py")


async def run(command: dict) -> dict:
    params = StdioServerParameters(command=PYTHON, args=[SERVER])
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            if command["action"] == "list_tools":
                result = await session.list_tools()
                return {
                    "ok": True,
                    "tools": [
                        {"name": t.name, "description": t.description}
                        for t in result.tools
                    ],
                }

            if command["action"] == "call_tool":
                result = await session.call_tool(
                    command["name"], command.get("arguments", {})
                )
                text = "\n".join(
                    part.text for part in result.content if hasattr(part, "text")
                )
                return {"ok": True, "isError": result.isError, "content": text}

            return {"ok": False, "error": f"unknown action: {command['action']}"}


def main() -> None:
    raw = sys.stdin.read()
    try:
        command = json.loads(raw)
        output = asyncio.run(run(command))
    except Exception as exc:  # noqa: BLE001 - always return valid JSON
        output = {"ok": False, "error": str(exc)}
    sys.stdout.write(json.dumps(output))


if __name__ == "__main__":
    main()
