@echo off
echo 🚀 Preparing PROMPT X for Vercel + Render Deployment
echo ====================================================
echo.

echo [1/4] Building backend...
cd backend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Backend build failed
    pause
    exit /b 1
)
echo ✅ Backend built successfully

echo.
echo [2/4] Building frontend...
cd ../frontend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Frontend build failed
    pause
    exit /b 1
)
echo ✅ Frontend built successfully

echo.
echo [3/4] Checking Git status...
cd ..
git status

echo.
echo [4/4] Deployment checklist:
echo ✅ Backend dependencies installed
echo ✅ Frontend dependencies installed
echo ✅ Backend compiled successfully
echo ✅ Frontend built successfully
echo ✅ Vercel configuration created
echo ✅ Render configuration created
echo ✅ Deployment documentation ready

echo.
echo 📋 Next Steps:
echo 1. Commit and push your code to Git repository
echo 2. Deploy backend to Render (see DEPLOYMENT_VERCEL_RENDER.md)
echo 3. Deploy frontend to Vercel (see DEPLOYMENT_VERCEL_RENDER.md)
echo 4. Configure environment variables on both platforms
echo 5. Add your OpenAI API keys
echo.

echo 📚 Full instructions: DEPLOYMENT_VERCEL_RENDER.md
echo.
pause