# Demo MCP filesystem server (real, sandboxed)

A genuine MCP server - built on the official `mcp` Python SDK, speaking the
real stdio JSON-RPC protocol - hard-restricted to `mcp-guardian/sandbox/`.

Why it's in its own venv: the `mcp` SDK pulls a newer `starlette` that
conflicts with the pinned `starlette` version FastAPI needs in
`backend/`. Keeping this fully isolated means installing/upgrading it can
never break the main API server. The backend talks to it over a tiny
JSON-over-stdio bridge (`bridge.py`) - no `mcp` import in the backend venv.

## Setup

```bash
cd mcp-servers/filesystem
python -m venv .venv
./.venv/Scripts/pip install "mcp>=1.2.0"     # Windows
# source .venv/bin/activate && pip install "mcp>=1.2.0"   # macOS/Linux
```

That's it - the backend auto-detects this venv at
`GET /api/mcp/status` and enables the live demo endpoints once it exists.

## What it exposes

Two read-only tools, both confined to `../../sandbox/`:

- `list_files()` - list files in the sandbox
- `read_file(name)` - read one file's contents

Any path that would escape the sandbox (`../`, absolute paths, symlinks) is
rejected with `ValueError` before touching disk - verified in
`backend/tests/test_mcp_bridge.py`.

## Try it directly

```bash
echo '{"action":"list_tools"}' | ./.venv/Scripts/python.exe bridge.py
echo '{"action":"call_tool","name":"read_file","arguments":{"name":"vendor-config.txt"}}' | ./.venv/Scripts/python.exe bridge.py
```

`vendor-config.txt` in the sandbox contains a real embedded prompt-injection /
tool-poisoning attempt - call it through the backend's
`POST /api/mcp/call` (or the "Try a real MCP tool call" panel in
Settings → Integrations) to see Guardian's engine genuinely catch it.
