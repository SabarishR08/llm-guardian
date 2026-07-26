"""A real MCP filesystem server, hard-sandboxed to a single folder.

Built on the official MCP Python SDK (`mcp.server.fastmcp`) - this speaks the
genuine Model Context Protocol over stdio, not an approximation. Every path is
resolved and verified to stay inside SANDBOX_ROOT before any file operation;
anything that would escape it (via `..`, symlinks, or an absolute path) is
rejected before touching disk.

Capabilities are intentionally minimal and read-only:
  - list_files() -> directory listing of the sandbox
  - read_file(name) -> contents of one file inside the sandbox

No write, no delete, no shell execution, no path outside the sandbox.
"""

from __future__ import annotations

from pathlib import Path

from mcp.server.fastmcp import FastMCP

# The sandbox is a fixed sibling directory: mcp-guardian/sandbox/
SANDBOX_ROOT = (Path(__file__).resolve().parent.parent.parent / "sandbox").resolve()

mcp = FastMCP("guardian-demo-filesystem")


def _resolve_safe(name: str) -> Path:
    """Resolve `name` inside SANDBOX_ROOT or raise - blocks traversal/absolute paths."""
    candidate = (SANDBOX_ROOT / name).resolve()
    if SANDBOX_ROOT not in candidate.parents and candidate != SANDBOX_ROOT:
        raise ValueError(f"Access denied: '{name}' resolves outside the sandbox.")
    if not candidate.is_relative_to(SANDBOX_ROOT):
        raise ValueError(f"Access denied: '{name}' resolves outside the sandbox.")
    return candidate


@mcp.tool()
def list_files() -> list[str]:
    """List every file available in the sandboxed directory."""
    if not SANDBOX_ROOT.exists():
        return []
    return sorted(p.name for p in SANDBOX_ROOT.iterdir() if p.is_file())


@mcp.tool()
def read_file(name: str) -> str:
    """Read the contents of one file inside the sandboxed directory.

    Args:
        name: The filename (no path separators) to read, e.g. "readme.txt".
    """
    path = _resolve_safe(name)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"No such file in sandbox: {name}")
    return path.read_text(encoding="utf-8", errors="replace")


if __name__ == "__main__":
    mcp.run(transport="stdio")
