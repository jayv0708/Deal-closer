param (
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\setup_dev.ps1"
    Write-Host "Starts local PostgreSQL and Redis containers using Docker Compose."
    Write-Host "Applies Alembic database migrations."
    exit
}

Write-Host "Starting Docker containers..." -ForegroundColor Green
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start Docker containers." -ForegroundColor Red
    exit 1
}

Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Running Alembic migrations..." -ForegroundColor Green
cd backend
alembic upgrade head

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to apply database migrations." -ForegroundColor Red
    cd ..
    exit 1
}

cd ..
Write-Host "Development environment setup complete!" -ForegroundColor Green
Write-Host "You can now run the backend with: cd backend ; uvicorn app.main:app --reload" -ForegroundColor Cyan
