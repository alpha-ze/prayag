#!/bin/bash
set -e

echo "Starting PROMPT X Application..."
echo

echo "[1/4] Checking dependencies..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed"
    echo "Please install Docker and try again"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js and try again"
    exit 1
fi

echo "[2/4] Setting up environment..."
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo
    echo "IMPORTANT: Please edit .env file and add your AI API keys before starting the application"
    echo "Press Enter to continue after updating .env..."
    read
fi

echo "[3/4] Starting database..."
docker-compose up -d postgres
sleep 5

echo "[4/4] Setting up and starting application..."
npm run setup
npm run db:migrate
npm run db:seed

echo
echo "==========================================="
echo "PROMPT X Application is starting..."
echo "==========================================="
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:3001"
echo
echo "Default Login Credentials:"
echo "Admin: admin@promptx.com / admin123"
echo "Participant: player@example.com / participant123"
echo
echo "Press Ctrl+C to stop all services"
echo "==========================================="
echo

npm run dev