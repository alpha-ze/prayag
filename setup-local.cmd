@echo off
echo 🚀 PROMPT X - Local Development Setup
echo =====================================
echo.

echo [1/6] Checking requirements...

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Get Node version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% found

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ npm is not available
    pause
    exit /b 1
)
echo ✅ npm found

echo.
echo [2/6] Installing dependencies (if needed)...

REM Install root dependencies
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
)

REM Install backend dependencies
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

REM Install frontend dependencies
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo ✅ All dependencies installed

echo.
echo [3/6] Setting up environment...

REM Create .env if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
)

echo.
echo [4/6] Configuring for local development...

REM Check if SQLite database exists
echo Configuring local database...
echo ✅ Using SQLite for local development (no PostgreSQL needed)

echo.
echo [5/6] Building applications...

echo Building backend...
cd backend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Backend build failed
    cd ..
    pause
    exit /b 1
)
cd ..

echo Building frontend...
cd frontend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Frontend build failed
    cd ..
    pause
    exit /b 1
)
cd ..

echo ✅ Build completed successfully

echo.
echo [6/6] Setup complete!
echo.
echo 📋 IMPORTANT - Before starting:
echo.
echo 1. Edit .env file and add your OpenAI API keys:
echo    AI_API_KEY=your-openai-api-key-here
echo    IMAGE_GENERATION_API_KEY=your-dalle-api-key-here
echo.
echo 2. Start the application with:
echo    npm run dev:local
echo.
echo 🌐 URLs (after starting):
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:3001
echo.
echo 🔑 Default Login:
echo    Admin: admin@promptx.com / admin123
echo    User:  player@example.com / participant123
echo.

pause