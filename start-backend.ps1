# BookYourShoot - Backend Startup Script
# Starts FastAPI backend server on port 8000

Write-Host "Starting BookYourShoot Backend Server..." -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Navigate to backend directory
Set-Location -Path "$PSScriptRoot\backend"

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: backend/.env file not found!" -ForegroundColor Yellow
    Write-Host "Please create .env file with your Stripe keys" -ForegroundColor Yellow
    Write-Host ""
}

# Check if virtual environment exists
if (Test-Path "$PSScriptRoot\.venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    & "$PSScriptRoot\.venv\Scripts\Activate.ps1"
}

# Start uvicorn server
Write-Host "Starting FastAPI on http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "API Docs available at http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
