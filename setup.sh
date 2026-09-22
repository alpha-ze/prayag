#!/bin/bash
set -e

echo "========================================"
echo "PROMPT X - AI Competition Platform Setup"
echo "========================================"
echo

echo "[1/7] Checking system requirements..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed"
    echo "Please install Docker from https://docker.com/"
    exit 1
fi

# Check versions
NODE_VERSION=$(node --version)
DOCKER_VERSION=$(docker --version)
echo "Node.js version: $NODE_VERSION"
echo "Docker version: $DOCKER_VERSION"
echo

echo "[2/7] Setting up environment file..."
if [ ! -f .env ]; then
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo
    echo "IMPORTANT: Please edit .env file with your configuration:"
    echo "- Add your OpenAI API key for AI_API_KEY"
    echo "- Add your DALL-E API key for IMAGE_GENERATION_API_KEY"
    echo "- Update JWT_SECRET with a secure random string"
    echo
    echo "Press Enter after updating .env file..."
    read
else
    echo ".env file already exists"
fi

echo "[3/7] Installing dependencies..."
echo "Installing root dependencies..."
npm install

echo "Installing backend dependencies..."
cd backend
npm install

cd ..
echo "Installing frontend dependencies..."
cd frontend
npm install

cd ..
echo

echo "[4/7] Starting PostgreSQL database..."
docker-compose up -d postgres
echo "Waiting for database to initialize..."
sleep 10

echo "[5/7] Setting up database schema..."
cd backend
npm run db:migrate

echo "[6/7] Seeding database with sample data..."
npm run db:seed

cd ..
echo "[7/7] Building applications..."
npm run build

echo
echo "========================================"
echo "Setup completed successfully!"
echo "========================================"
echo
echo "To start the application:"
echo "  npm run dev     (Development mode)"
echo "  docker-compose up   (Full Docker stack)"
echo
echo "Default URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo
echo "Default credentials:"
echo "  Admin:        admin@promptx.com / admin123"
echo "  Participant:  player@example.com / participant123"
echo
echo "For production deployment, use:"
echo "  docker-compose -f docker-compose.prod.yml up -d"
echo