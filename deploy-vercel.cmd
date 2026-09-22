@echo off
echo 🚀 Deploying PROMPT X to Vercel
echo ================================

REM Check if vercel CLI is installed
where vercel >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Installing Vercel CLI...
    npm install -g vercel
)

REM Build frontend
echo Building frontend...
cd frontend
call npm install
call npm run build

REM Deploy to Vercel
echo Deploying to Vercel...
cd ..
vercel --prod

echo ✅ Frontend deployed to Vercel!
echo 📝 Don't forget to:
echo    1. Update environment variables in Vercel dashboard
echo    2. Set VITE_API_URL to your Render backend URL
echo    3. Set VITE_WS_URL to your Render WebSocket URL

pause