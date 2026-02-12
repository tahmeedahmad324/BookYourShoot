# BookYourShoot - Frontend Startup Script
# Starts React development server on port 3000

Write-Host "Starting BookYourShoot Frontend..." -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

# Navigate to project root
Set-Location -Path $PSScriptRoot

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "Please create .env file with your configuration" -ForegroundColor Yellow
    Write-Host ""
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Start React development server
Write-Host "Starting React app on http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

npm start
