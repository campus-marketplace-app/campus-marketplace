#!/bin/bash
# Campus Marketplace - Local Development Setup Script
# For macOS and Linux
# Usage: bash dev.sh

echo "==============================================="
echo "Campus Marketplace - Development Setup"
echo "==============================================="
echo ""

# Step 1: Install dependencies
echo "[1/3] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Error: npm install failed"
    exit 1
fi
echo "✓ Dependencies installed"
echo ""

# Step 2: Start dev server in background
echo "[2/3] Starting development server..."
npm run dev &
DEV_PID=$!
echo "✓ Dev server started (http://localhost:5173)"
echo ""

# Step 3: Wait for server to start and open browser
echo "[3/3] Opening application in browser..."
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
