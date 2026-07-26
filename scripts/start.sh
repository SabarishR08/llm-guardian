#!/usr/bin/env bash
# MCP Guardian - start backend + dashboard (macOS / Linux).
# The sandboxed MCP server is spawned on demand by the backend.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "$root/backend/.venv" ]; then
  echo "Backend venv missing - run ./scripts/setup.sh first."
  exit 1
fi

cleanup() { kill 0; }
trap cleanup EXIT INT TERM

echo "Starting backend   → http://localhost:8000/docs"
( cd "$root/backend" && ./.venv/bin/python -m uvicorn app.main:app --port 8000 --reload ) &

echo "Starting dashboard → http://localhost:5173  (chat at /chat)"
( cd "$root/dashboard" && npm run dev ) &

echo ""
echo "  Chat (primary)   → http://localhost:5173/chat"
echo "  SOC dashboard    → http://localhost:5173/overview"
echo "  API docs         → http://localhost:8000/docs"
echo "  Demo login       → demo@mcpguardian.dev / guardian"
echo ""
wait
