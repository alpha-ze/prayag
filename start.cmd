@echo off
echo Starting PROMPT X Application...
echo.

echo [1/4] Checking dependencies...
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop and try again
    pause
    exit /b 1
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js and try again
    pause
    exit /b 1
)

echo [2/4] Setting up environment...
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit .env file and add your AI API keys before starting the application
    echo Press any key to continue after updating .env...
    pause
)

echo [3/4] Starting database...
docker-compose up -d postgres
timeout /t 5

echo [4/4] Setting up and starting application...
call npm run setup
call npm run db:migrate
call npm run db:seed

echo.
echo ===========================================
echo PROMPT X Application is starting...
echo ===========================================
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:3001
echo.
echo Default Login Credentials:
echo Admin: admin@promptx.com / admin123
echo Participant: player@example.com / participant123
echo.
echo Press Ctrl+C to stop all services
echo ===========================================
echo.

npm run dev