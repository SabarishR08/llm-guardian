"""Tests for the real, sandboxed MCP filesystem server integration.

These exercise the actual bridge subprocess, so they're skipped if the
isolated MCP-server venv hasn't been set up (see mcp-servers/filesystem/README.md).
"""

import pytest

from app.services import mcp_bridge

pytestmark = pytest.mark.skipif(
    not mcp_bridge.is_available(), reason="mcp-servers/filesystem/.venv not set up"
)


@pytest.mark.asyncio
async def test_list_tools_returns_real_tools():
    tools = await mcp_bridge.list_tools()
    names = {t["name"] for t in tools}
    assert names == {"list_files", "read_file"}


@pytest.mark.asyncio
async def test_read_clean_file():
    content, is_error = await mcp_bridge.call_tool("read_file", {"name": "readme.txt"})
    assert not is_error
    assert "sandboxed" in content


@pytest.mark.asyncio
async def test_path_traversal_blocked():
    content, is_error = await mcp_bridge.call_tool(
        "read_file", {"name": "../../backend/.env"}
    )
    assert is_error
    assert "Access denied" in content


@pytest.mark.asyncio
async def test_nonexistent_file():
    content, is_error = await mcp_bridge.call_tool(
        "read_file", {"name": "does-not-exist.txt"}
    )
    assert is_error
