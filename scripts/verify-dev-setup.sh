#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++)) || true
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++)) || true
}

# Get script directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "========================================"
echo "Development Setup Verification"
echo "========================================"
echo ""

# Test 1: Verify docker-compose.yml is valid and doesn't have obsolete version field
log_info "Test 1: Checking docker-compose.yml structure..."
if grep -q "^version:" docker-compose.yml; then
    log_error "docker-compose.yml still contains obsolete 'version' field"
else
    log_success "docker-compose.yml does not contain obsolete 'version' field"
fi

if docker compose config > /dev/null 2>&1; then
    log_success "docker-compose.yml is valid"
else
    log_error "docker-compose.yml is invalid"
fi

# Test 2: Start Docker Compose and verify PostgreSQL
log_info "Test 2: Starting Docker Compose..."
pnpm docker:up > /dev/null 2>&1

# Wait for PostgreSQL to be healthy
log_info "Waiting for PostgreSQL to be healthy (max 30 seconds)..."
RETRY_COUNT=0
MAX_RETRIES=30
POSTGRES_HEALTHY=false
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose ps postgres 2>/dev/null | grep -q "healthy"; then
        POSTGRES_HEALTHY=true
        log_success "PostgreSQL container is healthy"
        break
    fi
    sleep 1
    ((RETRY_COUNT++)) || true
done

if [ "$POSTGRES_HEALTHY" = false ]; then
    log_error "PostgreSQL container did not become healthy in time"
fi

# Test 3: Verify pg_isready
log_info "Test 3: Checking PostgreSQL readiness..."
if docker compose exec -T postgres pg_isready -U tripful > /dev/null 2>&1; then
    log_success "pg_isready passes"
else
    log_error "pg_isready failed"
fi

# Test 4: Verify database connection
log_info "Test 4: Testing database connection..."
if docker compose exec -T postgres psql -U tripful -d tripful -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "Database connection successful"
else
    log_error "Database connection failed"
fi

# Test 5: Verify .env files exist
log_info "Test 5: Checking .env files..."
if [ -f apps/api/.env ]; then
    log_success "apps/api/.env exists"
else
    log_error "apps/api/.env does not exist"
fi

if [ -f apps/web/.env.local ]; then
    log_success "apps/web/.env.local exists"
else
    log_error "apps/web/.env.local does not exist"
fi

# Test 6: Verify turbo.json has persistent dev tasks
log_info "Test 6: Checking turbo.json configuration..."
if grep -q '"persistent": true' turbo.json; then
    log_success "turbo.json has persistent dev tasks configured"
else
    log_error "turbo.json missing persistent dev tasks"
fi

# Test 7: Verify package.json has docker scripts
log_info "Test 7: Checking package.json docker scripts..."
DOCKER_SCRIPTS_OK=true
if ! grep -q '"docker:up"' package.json; then
    log_error "package.json missing docker:up script"
    DOCKER_SCRIPTS_OK=false
fi
if ! grep -q '"docker:down"' package.json; then
    log_error "package.json missing docker:down script"
    DOCKER_SCRIPTS_OK=false
fi
if ! grep -q '"docker:logs"' package.json; then
    log_error "package.json missing docker:logs script"
    DOCKER_SCRIPTS_OK=false
fi
if [ "$DOCKER_SCRIPTS_OK" = true ]; then
    log_success "All docker scripts present in package.json"
fi

# Test 8: Start dev servers in background and verify they start
log_info "Test 8: Starting dev servers..."

# Kill any existing processes first
pkill -f "next dev" 2>/dev/null || true
pkill -f "tsx.*src/index.ts" 2>/dev/null || true
sleep 2

# Start dev servers in background
timeout 90s pnpm dev > /tmp/tripful-dev-output.log 2>&1 &
DEV_PID=$!

# Wait for servers to start
log_info "Waiting for servers to start (max 60 seconds)..."
API_STARTED=false
WEB_STARTED=false

for i in {1..60}; do
    # Check if API is running on port 8000
    if [ "$API_STARTED" = false ] && nc -z localhost 8000 2>/dev/null; then
        log_success "API server started on port 8000"
        API_STARTED=true
    fi

    # Check if Web is running on port 3000
    if [ "$WEB_STARTED" = false ] && nc -z localhost 3000 2>/dev/null; then
        log_success "Web server started on port 3000"
        WEB_STARTED=true
    fi

    # Break if both started
    if [ "$API_STARTED" = true ] && [ "$WEB_STARTED" = true ]; then
        break
    fi

    sleep 1
done

if [ "$API_STARTED" = false ]; then
    log_error "API server did not start on port 8000"
    log_info "Last lines of dev output:"
    tail -20 /tmp/tripful-dev-output.log
fi

if [ "$WEB_STARTED" = false ]; then
    log_error "Web server did not start on port 3000"
    log_info "Last lines of dev output:"
    tail -20 /tmp/tripful-dev-output.log
fi

# Test 9: Verify API health endpoint
if [ "$API_STARTED" = true ]; then
    log_info "Test 9: Testing API health endpoint..."
    # Wait a moment for the server to be fully ready
    sleep 3

    HEALTH_RESPONSE=$(curl -s http://localhost:8000/api/health 2>&1 || echo "FAILED")
    if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
        log_success "API health endpoint responds correctly"

        # Check if database connection is reported
        if echo "$HEALTH_RESPONSE" | grep -q "connected"; then
            log_success "API reports database connection as 'connected'"
        else
            log_error "API does not report database as 'connected'"
            echo "  Response: $HEALTH_RESPONSE"
        fi
    else
        log_error "API health endpoint did not respond correctly"
        echo "  Response: $HEALTH_RESPONSE"
    fi
fi

# Test 10: Verify CORS headers
if [ "$API_STARTED" = true ]; then
    log_info "Test 10: Testing CORS headers..."
    CORS_RESPONSE=$(curl -s -I -H "Origin: http://localhost:3000" http://localhost:8000/api/health 2>&1)
    if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
        log_success "API returns CORS headers"
    else
        log_error "API does not return CORS headers"
        echo "  Response headers:"
        echo "$CORS_RESPONSE"
    fi
fi

# Cleanup: Kill dev servers
log_info "Cleaning up dev servers..."
kill $DEV_PID 2>/dev/null || true
sleep 2
# Kill any remaining node processes on ports 3000 and 8000
pkill -f "next dev" 2>/dev/null || true
pkill -f "tsx.*src/index.ts" 2>/dev/null || true
sleep 1

# Summary
echo ""
echo "========================================"
echo "Verification Summary"
echo "========================================"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo "========================================"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. See output above.${NC}"
    exit 1
fi
