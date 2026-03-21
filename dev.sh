#!/bin/bash
# Campus Marketplace - Local Development Setup Script
# For macOS and Linux
# Usage: bash dev.sh

echo "==============================================="
echo "Campus Marketplace - Development Setup"
echo "==============================================="
echo ""

# Check Node version
NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d'.' -f1)
if [ "$NODE_MAJOR" != "22" ]; then
    echo "Error: Node 22 required (found $NODE_VERSION). Run: nvm use 22"
    exit 1
fi

# Step 1: Install dependencies
echo "[1/4] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Error: npm install failed"
    exit 1
fi
echo "✓ Dependencies installed"
echo ""

# Step 2: Build backend
echo "[2/4] Building backend..."
npm run build --workspace=apps/backend
if [ $? -ne 0 ]; then
    echo "Error: backend build failed"
    exit 1
fi
echo "✓ Backend built"
echo ""

# Step 3: Start dev server in background
echo "[3/4] Starting development server..."
npm run dev &
DEV_PID=$!
echo "✓ Dev server started (http://localhost:5173)"
echo ""

# Step 4: Wait for server to start and open browser
echo "[4/4] Opening application in browser..."
sleep 3

# Detect OS and open browser accordingly
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "http://localhost:5173"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:5173"
    elif command -v gnome-open &> /dev/null; then
        gnome-open "http://localhost:5173"
    fi
fi

echo "✓ Browser opened"
echo ""
echo "==============================================="
echo "Campus Marketplace is ready!"
echo "Press Ctrl+C to stop the dev server"
echo "==============================================="

# Wait for dev server process
wait $DEV_PID
