# MCP Guardian - start backend + dashboard (Windows / PowerShell).
# Opens each in its own window. The sandboxed MCP server is spawned on demand
# by the backend, so it needs no separate process here.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path "$root/backend/.venv")) {
  Write-Host "Backend venv missing - run ./scripts/setup.ps1 first." -ForegroundColor Yellow
  exit 1
}

Write-Host "Starting backend  → http://localhost:8000/docs" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root/backend'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --reload"
)

Write-Host "Starting dashboard → http://localhost:5173  (chat at /chat)" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$root/dashboard'; npm run dev"
)

Write-Host "`nBoth launching in separate windows." -ForegroundColor Green
Write-Host "  Chat (primary)   → http://localhost:5173/chat"
Write-Host "  SOC dashboard    → http://localhost:5173/overview"
Write-Host "  API docs         → http://localhost:8000/docs"
Write-Host "  Demo login       → demo@mcpguardian.dev / guardian`n"
