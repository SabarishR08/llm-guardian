# MCP Guardian - one-time setup (Windows / PowerShell).
# Creates the backend venv, the isolated MCP-server venv, installs dashboard
# deps, and seeds env files. Safe to re-run.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "`n[1/4] Backend virtualenv + dependencies..." -ForegroundColor Cyan
Push-Location "$root/backend"
if (-not (Test-Path ".venv")) { python -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install --quiet --upgrade pip
& .\.venv\Scripts\python.exe -m pip install --quiet -r requirements.txt -r requirements-dev.txt
Pop-Location

Write-Host "[2/4] MCP filesystem server (isolated venv - keeps 'mcp' out of the backend)..." -ForegroundColor Cyan
Push-Location "$root/mcp-servers/filesystem"
if (-not (Test-Path ".venv")) { python -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install --quiet "mcp>=1.2.0"
Pop-Location

Write-Host "[3/4] Dashboard dependencies..." -ForegroundColor Cyan
Push-Location "$root/dashboard"
npm install --silent
Pop-Location

Write-Host "[4/4] Env files..." -ForegroundColor Cyan
if (-not (Test-Path "$root/backend/.env")) { Copy-Item "$root/backend/.env.example" "$root/backend/.env" }
if (-not (Test-Path "$root/dashboard/.env.local")) { Copy-Item "$root/dashboard/.env.example" "$root/dashboard/.env.local" }

Write-Host "`nSetup complete." -ForegroundColor Green
Write-Host "  (optional) add a Groq key to backend/.env for real LLM replies + hybrid detection"
Write-Host "  then run:  ./scripts/start.ps1`n"
