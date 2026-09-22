#!/bin/bash

echo "🚀 Deploying PROMPT X to Vercel"
echo "================================"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build

# Deploy to Vercel
echo "Deploying to Vercel..."
cd ..
vercel --prod

echo "✅ Frontend deployed to Vercel!"
echo "📝 Don't forget to:"
echo "   1. Update environment variables in Vercel dashboard"
echo "   2. Set VITE_API_URL to your Render backend URL"
echo "   3. Set VITE_WS_URL to your Render WebSocket URL"