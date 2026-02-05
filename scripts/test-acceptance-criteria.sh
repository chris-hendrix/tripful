#!/bin/bash
# Test all acceptance criteria from Task 5.1

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
    echo -e "${YELLOW}TEST:${NC} $1"
}

log_pass() {
    echo -e "  ${GREEN}PASS${NC}"
    ((TESTS_PASSED++)) || true
}

log_fail() {
    echo -e "  ${RED}FAIL${NC} $1"
    ((TESTS_FAILED++)) || true
}

# Get script directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "========================================"
echo "Task 5.1 Acceptance Criteria Tests"
echo "========================================"
echo ""

# AC1: docker compose up -d starts PostgreSQL successfully
log_test "AC1: 'docker compose up -d' starts PostgreSQL successfully"
pnpm docker:up > /dev/null 2>&1
sleep 3
if docker compose ps postgres 2>/dev/null | grep -q "Up"; then
    log_pass
else
    log_fail "PostgreSQL container not running"
fi

# AC2: Database is healthy (pg_isready passes)
log_test "AC2: Database is healthy (pg_isready passes)"
RETRY=0
while [ $RETRY -lt 30 ]; do
    if docker compose ps postgres 2>/dev/null | grep -q "healthy"; then
        break
    fi
    sleep 1
    ((RETRY++)) || true
done

if docker compose exec -T postgres pg_isready -U tripful > /dev/null 2>&1; then
    log_pass
else
    log_fail "pg_isready failed"
fi

# AC3: API connects to database (health check shows "connected")
log_test "AC3: API connects to database"

# Kill any existing processes
pkill -f "tsx.*src/server.ts" 2>/dev/null || true
sleep 2

# Start API server
cd /home/chend/git/tripful/apps/api
timeout 30s pnpm dev > /tmp/api-test.log 2>&1 &
API_PID=$!
cd /home/chend/git/tripful

# Wait for API to start
API_STARTED=false
for i in {1..30}; do
    if nc -z localhost 8000 2>/dev/null; then
        API_STARTED=true
        break
    fi
    sleep 1
done

if [ "$API_STARTED" = true ]; then
    sleep 2
    HEALTH=$(curl -s http://localhost:8000/api/health 2>/dev/null || echo "FAILED")
    if echo "$HEALTH" | grep -q "connected"; then
        log_pass
    else
        log_fail "Health check does not show 'connected'"
    fi
else
    log_fail "API server did not start"
fi

# AC4: pnpm dev starts both web (3000) and api (8000) in parallel
log_test "AC4: 'pnpm dev' starts both servers in parallel"

# Kill existing servers
kill $API_PID 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "tsx.*src/server.ts" 2>/dev/null || true
sleep 2

# Start both servers
timeout 60s pnpm dev > /tmp/dev-test.log 2>&1 &
DEV_PID=$!

# Wait for both to start
WEB_STARTED=false
API_STARTED=false

for i in {1..45}; do
    if ! $WEB_STARTED && nc -z localhost 3000 2>/dev/null; then
        WEB_STARTED=true
    fi
    if ! $API_STARTED && nc -z localhost 8000 2>/dev/null; then
        API_STARTED=true
    fi
    if $WEB_STARTED && $API_STARTED; then
        break
    fi
    sleep 1
done

if [ "$WEB_STARTED" = true ] && [ "$API_STARTED" = true ]; then
    log_pass
else
    if [ "$WEB_STARTED" = false ]; then
        log_fail "Web server (port 3000) did not start"
    fi
    if [ "$API_STARTED" = false ]; then
        log_fail "API server (port 8000) did not start"
    fi
fi

# AC5: Hot reload works for both apps
log_test "AC5: Hot reload is configured for both apps"
HOT_RELOAD_OK=true

# Check turbo.json persistent tasks
if ! grep -q '"persistent": true' turbo.json; then
    log_fail "turbo.json missing persistent dev tasks"
    HOT_RELOAD_OK=false
fi

# Check API tsx watch
if ! grep -q 'tsx watch' apps/api/package.json; then
    log_fail "API missing tsx watch mode"
    HOT_RELOAD_OK=false
fi

# Check Web next dev
if ! grep -q 'next dev' apps/web/package.json; then
    log_fail "Web missing next dev mode"
    HOT_RELOAD_OK=false
fi

if [ "$HOT_RELOAD_OK" = true ]; then
    log_pass
fi

# AC6: CORS allows frontend to call backend API
log_test "AC6: CORS allows frontend to call backend API"
if [ "$API_STARTED" = true ]; then
    CORS=$(curl -s -I -H "Origin: http://localhost:3000" http://localhost:8000/api/health 2>&1)
    if echo "$CORS" | grep -qi "access-control-allow-origin"; then
        log_pass
    else
        log_fail "CORS headers not present"
    fi
else
    log_fail "Cannot test CORS - API not running"
fi

# Cleanup
log_test "Cleanup: Stopping dev servers"
kill $DEV_PID 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "tsx.*src/server.ts" 2>/dev/null || true
sleep 2
log_pass

# Summary
echo ""
echo "========================================"
echo "Acceptance Criteria Results"
echo "========================================"
echo -e "${GREEN}Passed: $TESTS_PASSED / 7${NC}"
echo -e "${RED}Failed: $TESTS_FAILED / 7${NC}"
echo "========================================"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All acceptance criteria met!${NC}"
    exit 0
else
    echo -e "${RED}Some acceptance criteria not met.${NC}"
    exit 1
fi
