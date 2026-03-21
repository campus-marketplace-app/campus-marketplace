# Campus Marketplace - Development Setup Script (Windows PowerShell)
# Usage: .\dev.ps1

$separator = "==============================================="

Write-Host $separator -ForegroundColor Cyan
Write-Host "Campus Marketplace - Development Setup" -ForegroundColor Cyan
Write-Host $separator -ForegroundColor Cyan
Write-Host ""

# Check Node version
$nodeVersion = (node --version)
if (-not $nodeVersion.StartsWith("v22")) {
    Write-Host "Error: Node 22 required (found $nodeVersion). Run: nvm use 22" -ForegroundColor Red
    exit 1
}

# Step 1: Install dependencies
Write-Host "[1/4] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Build backend
Write-Host "[2/4] Building backend..." -ForegroundColor Yellow
npm run build --workspace=apps/backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: backend build failed" -ForegroundColor Red
    exit 1
}
Write-Host "Backend built" -ForegroundColor Green
Write-Host ""

# Step 3: Start dev server in background
Write-Host "[3/4] Starting development server..." -ForegroundColor Yellow
$workDir = Get-Location
$devCmd = "cd '$workDir'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $devCmd | Out-Null
Write-Host "Dev server started (http://localhost:5173)" -ForegroundColor Green
Write-Host ""

# Step 4: Wait for server to start and open browser
Write-Host "[4/4] Opening application in browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 4
Start-Process "http://localhost:5173"
Write-Host "Browser opened" -ForegroundColor Green
Write-Host ""

Write-Host $separator -ForegroundColor Cyan
Write-Host "Campus Marketplace is ready!" -ForegroundColor Cyan
Write-Host "Press Ctrl+C in the dev server window to stop" -ForegroundColor Yellow
Write-Host $separator -ForegroundColor Cyan
