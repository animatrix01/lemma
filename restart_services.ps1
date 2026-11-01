#!/usr/bin/env pwsh
# LEMMA Services Restart Script

Write-Host "================================" -ForegroundColor Cyan
Write-Host "LEMMA Services Restart" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "Error: Please run this script from the LEMMA project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Stopping existing services..." -ForegroundColor Yellow

# Find and kill Python processes (backend)
$pythonProcs = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*uvicorn*" -or $_.CommandLine -like "*backend.main*"
}
if ($pythonProcs) {
    Write-Host "  Stopping backend processes..." -ForegroundColor Gray
    $pythonProcs | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Find and kill Node processes (frontend) - this will also affect other Node apps
Write-Host "  Note: You need to manually stop the frontend dev server (Ctrl+C)" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 2: Starting backend..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
}
Start-Sleep -Seconds 3

# Check if backend started
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Backend started successfully!" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Backend failed to start. Check the logs." -ForegroundColor Red
    Receive-Job -Job $backendJob
    exit 1
}

Write-Host ""
Write-Host "Step 3: Starting frontend..." -ForegroundColor Yellow
Write-Host "  Run this in a separate terminal:" -ForegroundColor Gray
Write-Host "    cd frontend" -ForegroundColor White
Write-Host "    npm run dev" -ForegroundColor White
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Backend: http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend is running in background (Job ID: $($backendJob.Id))" -ForegroundColor Gray
Write-Host "To stop backend: Stop-Job -Id $($backendJob.Id); Remove-Job -Id $($backendJob.Id)" -ForegroundColor Gray
Write-Host ""

# Keep script running to show backend logs
Write-Host "Press Ctrl+C to stop monitoring backend logs..." -ForegroundColor Yellow
Write-Host ""
Receive-Job -Job $backendJob -Wait
