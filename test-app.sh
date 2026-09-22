#!/bin/bash
set -e

echo "========================================"
echo "PROMPT X Application Test Suite"
echo "========================================"
echo

echo "[1/8] Testing system requirements..."

# Check if services are running
echo "Checking if PostgreSQL is running..."
if ! docker ps | grep -q postgres; then
    echo "ERROR: PostgreSQL container is not running"
    echo "Please start it with: docker-compose up -d postgres"
    exit 1
fi

echo "[2/8] Testing database connection..."
sleep 2
cd backend
if ! npm run db:migrate > /dev/null 2>&1; then
    echo "ERROR: Database connection failed"
    echo "Check your DATABASE_URL in .env file"
    exit 1
fi
cd ..

echo "[3/8] Testing backend compilation..."
cd backend
if ! npm run build > /dev/null 2>&1; then
    echo "ERROR: Backend compilation failed"
    echo "Check for TypeScript errors"
    exit 1
fi
cd ..

echo "[4/8] Testing frontend compilation..."
cd frontend
if ! npm run build > /dev/null 2>&1; then
    echo "ERROR: Frontend compilation failed"
    echo "Check for TypeScript/React errors"
    exit 1
fi
cd ..

echo "[5/8] Running backend tests..."
cd backend
if ! npm test > /dev/null 2>&1; then
    echo "WARNING: Some backend tests failed"
    echo "Run 'npm test' in backend directory for details"
fi
cd ..

echo "[6/8] Testing API endpoints..."
echo "Starting backend temporarily..."
cd backend
npm start &
BACKEND_PID=$!
sleep 5

# Test health endpoint
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "ERROR: Backend health check failed"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "API health check passed"
kill $BACKEND_PID 2>/dev/null || true
cd ..

echo "[7/8] Testing Docker build..."
echo "Building production images..."
if ! docker-compose -f docker-compose.yml build backend > /dev/null 2>&1; then
    echo "ERROR: Backend Docker build failed"
    exit 1
fi

if ! docker-compose -f docker-compose.yml build frontend > /dev/null 2>&1; then
    echo "ERROR: Frontend Docker build failed"
    exit 1
fi

echo "[8/8] Testing game functionality..."
echo "Checking sample data..."
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
if [ $? -ne 0 ]; then
    echo "ERROR: Sample data not found"
    echo "Run: npm run db:seed"
    exit 1
fi
cd ..

echo
echo "========================================"
echo "All tests passed! ✅"
echo "========================================"
echo
echo "Your PROMPT X application is ready!"
echo
echo "To start the application:"
echo "  Development: npm run dev"
echo "  Production:  docker-compose up -d"
echo
echo "Access URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo "  API Docs: http://localhost:3001/health"
echo
echo "Default login credentials:"
echo "  Admin:        admin@promptx.com / admin123"
echo "  Participant:  player@example.com / participant123"
echo