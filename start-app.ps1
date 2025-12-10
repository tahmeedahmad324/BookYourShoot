# Start BookYourShoot - Frontend & Backend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting BookYourShoot Application" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend in a new PowerShell window
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host 'Backend Server (Port 8000)' -ForegroundColor Green; python -m uvicorn backend.main:app --reload --port 8000"

# Wait a moment for backend to initialize
Start-Sleep -Seconds 3

# Start Frontend in a new PowerShell window
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host 'Frontend Server (Port 3000)' -ForegroundColor Green; npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Spotify API: Integrated" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Both servers are running in separate windows." -ForegroundColor White
Write-Host "Close those windows to stop the servers." -ForegroundColor White
Write-Host ""
