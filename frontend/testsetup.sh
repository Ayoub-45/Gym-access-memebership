#!/bin/bash

set -e  # Exit on any error

echo "🚀 Starting frontend E2E test environment setup..."

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============================================
# 1. Install Dependencies
# ============================================
echo ""
echo "📦 Installing frontend dependencies..."
npm install

# ============================================
# 2. Check if backend is running
# ============================================
echo ""
echo "🔍 Checking if backend is running..."

BACKEND_RUNNING=false
BACKEND_PORT=""

# Function to check backend health
# Accepts any HTTP response (200-499) as valid, including 401 and 404
check_backend() {
    local port=$1
    
    # Try different common endpoints
    local endpoints=(
        "/api/auth/login"
        "/api/health"
        "/api"
        "/"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local url="http://localhost:${port}${endpoint}"
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" "${url}" 2>/dev/null || echo "000")
        
        # Accept any response except connection failure (000) and server errors (5xx)
        if [ "$status_code" != "000" ] && [ "$status_code" -lt 500 ] 2>/dev/null; then
            echo "   ✓ Port ${port}${endpoint}: HTTP ${status_code}"
            return 0
        fi
    done
    
    echo "   ✗ Port ${port}: No response"
    return 1
}

# Check both ports - try 5000 first (Docker), then 3000 (local/Next.js API)
echo "Testing backend connectivity..."
if check_backend 5000; then
    echo "✅ Backend detected on port 5000"
    BACKEND_RUNNING=true
    BACKEND_PORT=5000
elif check_backend 3000; then
    echo "✅ Backend detected on port 3000"
    BACKEND_RUNNING=true
    BACKEND_PORT=3000
else
    echo "⚠️  Backend is NOT running on port 3000 or 5000"
    echo ""
    echo "E2E tests require the backend to be running."
    echo ""
    echo "Option 1 - Using Docker (recommended):"
    echo "  docker compose up"
    echo ""
    echo "Option 2 - Running locally:"
    echo "  cd ../backend"
    echo "  npm install"
    echo "  npm run dev"
    echo ""
    echo "💡 Note: If using Docker with network_mode: host, make sure:"
    echo "   - No other service is using port 5000"
    echo "   - The backend container is fully started"
    echo ""
    read -p "Press Enter when backend is ready, or Ctrl+C to cancel..."
    
    # Check again
    echo "Re-checking backend..."
    if check_backend 5000; then
        echo "✅ Backend is now running on port 5000"
        BACKEND_RUNNING=true
        BACKEND_PORT=5000
    elif check_backend 3000; then
        echo "✅ Backend is now running on port 3000"
        BACKEND_RUNNING=true
        BACKEND_PORT=3000
    else
        echo "❌ Backend still not detected. Exiting..."
        echo ""
        echo "💡 Debug tips:"
        echo "   1. Check if backend is running: docker compose ps"
        echo "   2. Check backend logs: docker compose logs backend"
        echo "   3. Test manually: curl -v http://localhost:5000"
        echo "   4. Check if port is in use: lsof -i :5000"
        exit 1
    fi
fi

echo ""
echo "📍 Backend configuration:"
echo "   - Port: $BACKEND_PORT"
echo "   - URL: http://localhost:$BACKEND_PORT"

# ============================================
# 3. Start Frontend Dev Server
# ============================================
echo ""
echo "🌐 Checking if frontend is running on http://localhost:3001..."

FRONTEND_ALREADY_RUNNING=false
if curl -s -o /dev/null http://localhost:3001 2>/dev/null; then
    echo "✅ Frontend is already running"
    FRONTEND_ALREADY_RUNNING=true
else
    echo "🚀 Starting frontend dev server..."
    npm run dev > /tmp/frontend-dev.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend started with PID: $FRONTEND_PID"
    
    # Wait for frontend to be ready (max 60 seconds)
    echo "⏳ Waiting for frontend to be ready..."
    for i in {1..60}; do
        if curl -s -o /dev/null http://localhost:3001 2>/dev/null; then
            echo ""
            echo "✅ Frontend is ready!"
            sleep 2  # Extra wait for full initialization
            break
        fi
        if [ $i -eq 60 ]; then
            echo ""
            echo "❌ Frontend failed to start within 60 seconds"
            echo "Check logs at /tmp/frontend-dev.log"
            if [ ! -z "$FRONTEND_PID" ]; then
                kill $FRONTEND_PID 2>/dev/null || true
            fi
            exit 1
        fi
        sleep 1
        echo -n "."
    done
fi

# ============================================
# 4. Verify Environment
# ============================================
echo ""
echo "🔍 Verifying test environment..."
echo "   - Backend: http://localhost:$BACKEND_PORT ✓"
echo "   - Frontend: http://localhost:3001 ✓"

# ============================================
# 5. Run Cypress E2E Tests
# ============================================
echo ""
echo "🧪 Running Cypress E2E tests..."
echo "================================================"

# Run Cypress in headless mode with Chrome
npm run test

TEST_EXIT_CODE=$?

# ============================================
# 6. Cleanup
# ============================================
if [ "$FRONTEND_ALREADY_RUNNING" = false ] && [ ! -z "$FRONTEND_PID" ]; then
    echo ""
    echo "🧹 Stopping frontend dev server..."
    kill $FRONTEND_PID 2>/dev/null || true
    # Also kill any remaining Next.js processes on port 3001
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
fi

# ============================================
# 7. Display Results
# ============================================
echo ""
echo "================================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All E2E tests passed!"
else
    echo "❌ Some tests failed (exit code: $TEST_EXIT_CODE)"
fi

echo ""
echo "📊 Test artifacts:"
echo "   - Videos: cypress/videos/"
echo "   - Screenshots: cypress/screenshots/ (if any failures)"
echo ""

exit $TEST_EXIT_CODE