#!/usr/bin/env bash
# MCP Guardian - one-time setup (macOS / Linux).
# Creates the backend venv, the isolated MCP-server venv, installs dashboard
# deps, and seeds env files. Safe to re-run.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "[1/4] Backend virtualenv + dependencies..."
cd "$root/backend"
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/python -m pip install --quiet --upgrade pip
./.venv/bin/python -m pip install --quiet -r requirements.txt -r requirements-dev.txt

echo "[2/4] MCP filesystem server (isolated venv - keeps 'mcp' out of the backend)..."
cd "$root/mcp-servers/filesystem"
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/python -m pip install --quiet "mcp>=1.2.0"

echo "[3/4] Dashboard dependencies..."
cd "$root/dashboard"
npm install --silent

echo "[4/4] Env files..."
[ -f "$root/backend/.env" ] || cp "$root/backend/.env.example" "$root/backend/.env"
[ -f "$root/dashboard/.env.local" ] || cp "$root/dashboard/.env.example" "$root/dashboard/.env.local"

echo ""
echo "Setup complete."
echo "  (optional) add a Groq key to backend/.env for real LLM replies + hybrid detection"
echo "  then run:  ./scripts/start.sh"
echo ""
