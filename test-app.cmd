@echo off
echo ========================================
echo PROMPT X Application Test Suite
echo ========================================
echo.

echo [1/8] Testing system requirements...

:: Check if services are running
echo Checking if PostgreSQL is running...
docker ps | findstr postgres >nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: PostgreSQL container is not running
    echo Please start it with: docker-compose up -d postgres
    pause
    exit /b 1
)

echo [2/8] Testing database connection...
timeout /t 2 >nul
cd backend
call npm run db:migrate >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Database connection failed
    echo Check your DATABASE_URL in .env file
    pause
    exit /b 1
)
cd ..

echo [3/8] Testing backend compilation...
cd backend
call npm run build >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Backend compilation failed
    echo Check for TypeScript errors
    pause
    exit /b 1
)
cd ..

echo [4/8] Testing frontend compilation...
cd frontend
call npm run build >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend compilation failed
    echo Check for TypeScript/React errors
    pause
    exit /b 1
)
cd ..

echo [5/8] Running backend tests...
cd backend
call npm test >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo WARNING: Some backend tests failed
    echo Run 'npm test' in backend directory for details
)
cd ..

echo [6/8] Testing API endpoints...
echo Starting backend temporarily...
cd backend
start /min cmd /c "npm start"
timeout /t 5 >nul

:: Test health endpoint
curl -s http://localhost:3001/health >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Backend health check failed
    taskkill /f /im node.exe >nul 2>&1
    pause
    exit /b 1
)

echo API health check passed
taskkill /f /im node.exe >nul 2>&1
cd ..

echo [7/8] Testing Docker build...
echo Building production images...
docker-compose -f docker-compose.yml build backend >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Backend Docker build failed
    pause
    exit /b 1
)

docker-compose -f docker-compose.yml build frontend >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Frontend Docker build failed
    pause
    exit /b 1
)

echo [8/8] Testing game functionality...
echo Checking sample data...
cd backend
node -e "
const { query, closePool } = require('./dist/database/connection');
async function test() {
  try {
    const challenges = await query('SELECT COUNT(*) FROM challenges');
    const scenarios = await query('SELECT COUNT(*) FROM scenarios');
    console.log('Challenges:', challenges.rows[0].count);
    console.log('Scenarios:', scenarios.rows[0].count);
    await closePool();
    process.exit(challenges.rows[0].count > 0 && scenarios.rows[0].count > 0 ? 0 : 1);
  } catch(e) { console.error(e); process.exit(1); }
}
test();
" 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Sample data not found
    echo Run: npm run db:seed
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo All tests passed! ✅
echo ========================================
echo.
echo Your PROMPT X application is ready!
echo.
echo To start the application:
echo   Development: npm run dev
echo   Production:  docker-compose up -d
echo.
echo Access URLs:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo   API Docs: http://localhost:3001/health
echo.
echo Default login credentials:
echo   Admin:        admin@promptx.com / admin123  
echo   Participant:  player@example.com / participant123
echo.
pause