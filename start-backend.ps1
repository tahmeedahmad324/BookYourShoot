# Start BookYourShoot Backend
# Environment variables will be loaded automatically from .env file
Write-Host "Starting BookYourShoot Backend..." -ForegroundColor Green
Write-Host "✓ Loading environment variables from .env file" -ForegroundColor Cyan
Write-Host "✓ Starting Uvicorn server on http://localhost:8000" -ForegroundColor Cyan
Write-Host ""

# Start the backend - .env will be loaded by python-dotenv automatically
python -m uvicorn backend.main:app --reload --port 8000
