@echo off
echo ========================================
echo PROMPT X - AI Competition Platform Setup
echo ========================================
echo.

echo [1/7] Checking system requirements...

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check for Docker
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker is not installed
    echo Please install Docker Desktop from https://docker.com/
    pause
    exit /b 1
)

:: Check Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

:: Check Docker version
for /f "tokens=*" %%i in ('docker --version') do set DOCKER_VERSION=%%i
echo Docker version: %DOCKER_VERSION%
echo.

echo [2/7] Setting up environment file...
if not exist .env (
    echo Copying .env.example to .env...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit .env file with your configuration:
    echo - Add your OpenAI API key for AI_API_KEY
    echo - Add your DALL-E API key for IMAGE_GENERATION_API_KEY
    echo - Update JWT_SECRET with a secure random string
    echo.
    echo Press any key after updating .env file...
    pause >nul
) else (
    echo .env file already exists
)

echo [3/7] Installing dependencies...
echo Installing root dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install root dependencies
    pause
    exit /b 1
)

echo Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)

cd ..
echo Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install frontend dependencies
    pause
    exit /b 1
)

cd ..
echo.

echo [4/7] Starting PostgreSQL database...
docker-compose up -d postgres
echo Waiting for database to initialize...
timeout /t 10 /nobreak >nul

echo [5/7] Setting up database schema...
cd backend
call npm run db:migrate
if %ERRORLEVEL% neq 0 (
    echo ERROR: Database migration failed
    echo Make sure PostgreSQL is running and connection details are correct
    pause
    exit /b 1
)

echo [6/7] Seeding database with sample data...
call npm run db:seed
if %ERRORLEVEL% neq 0 (
    echo ERROR: Database seeding failed
    pause
    exit /b 1
)

cd ..
echo [7/7] Building applications...
call npm run build

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo To start the application:
echo   npm run dev     (Development mode)
echo   docker-compose up   (Full Docker stack)
echo.
echo Default URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo.
echo Default credentials:
echo   Admin:        admin@promptx.com / admin123
echo   Participant:  player@example.com / participant123
echo.
echo For production deployment, use:
echo   docker-compose -f docker-compose.prod.yml up -d
echo.
pause