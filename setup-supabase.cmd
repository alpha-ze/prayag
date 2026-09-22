@echo off
echo 🚀 PROMPT X - Supabase Setup
echo ==============================
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

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% found

echo.
echo [2/6] Installing dependencies...

REM Install backend dependencies (including Supabase)
echo Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ Backend dependencies installation failed
    pause
    exit /b 1
)
cd ..

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ Frontend dependencies installation failed
    pause
    exit /b 1
)
cd ..

echo ✅ All dependencies installed

echo.
echo [3/6] Environment configuration...

if not exist ".env" (
    echo Creating .env file from template...
    echo # Supabase Configuration> .env
    echo SUPABASE_URL=https://your-project-id.supabase.co>> .env
    echo SUPABASE_ANON_KEY=your-supabase-anon-key>> .env
    echo SUPABASE_DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres>> .env
    echo.>> .env
    echo # Authentication>> .env
    echo JWT_SECRET=prompt-x-super-secure-jwt-secret-change-in-production>> .env
    echo.>> .env
    echo # AI Services ^(REQUIRED!^)>> .env
    echo AI_API_KEY=your-openai-api-key-here>> .env
    echo AI_MODEL=gpt-4>> .env
    echo IMAGE_GENERATION_API_KEY=your-dalle-api-key-here>> .env
    echo.>> .env
    echo # Server>> .env
    echo NODE_ENV=development>> .env
    echo PORT=3001>> .env
    echo.>> .env
    echo # Frontend>> .env
    echo VITE_API_URL=http://localhost:3001>> .env
    echo VITE_WS_URL=ws://localhost:3001>> .env
)

echo ✅ Environment file ready

echo.
echo [4/6] Building applications...

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
echo [5/6] Setup complete!
echo.
echo 📋 NEXT STEPS - IMPORTANT:
echo.
echo 1. 🏗️  SET UP SUPABASE:
echo    • Go to https://supabase.com
echo    • Create a new project
echo    • Get your credentials from Settings → API
echo.
echo 2. ✏️  UPDATE .env FILE:
echo    Edit .env file and replace these values:
echo    • SUPABASE_URL=https://your-project-id.supabase.co
echo    • SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
echo    • SUPABASE_DATABASE_URL=postgresql://postgres:...
echo    • AI_API_KEY=your-openai-api-key
echo    • IMAGE_GENERATION_API_KEY=your-dalle-api-key
echo.
echo 3. 🗄️  SETUP DATABASE:
echo    After updating .env, run:
echo    • npm run db:migrate
echo    • npm run db:seed
echo.
echo 4. 🚀 START DEVELOPMENT:
echo    • npm run dev
echo.
echo 📚 DETAILED INSTRUCTIONS: See SUPABASE_SETUP.md
echo.
echo [6/6] Opening setup guide...
if exist "SUPABASE_SETUP.md" (
    start notepad SUPABASE_SETUP.md
)

echo.
pause