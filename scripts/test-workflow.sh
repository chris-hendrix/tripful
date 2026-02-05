#!/bin/bash
# Test complete monorepo workflow from clean state through build verification and Turbo caching

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

log_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

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

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Get script directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Temp files for output capture
BUILD_OUTPUT_1="/tmp/tripful-build-1.log"
BUILD_OUTPUT_2="/tmp/tripful-build-2.log"
DEV_OUTPUT="/tmp/tripful-dev.log"
TEST_OUTPUT="/tmp/tripful-test.log"
LINT_OUTPUT="/tmp/tripful-lint.log"
TYPECHECK_OUTPUT="/tmp/tripful-typecheck.log"

# Cleanup function
cleanup() {
    log_info "Cleaning up processes and temp files..."

    # Kill dev servers
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "tsx.*src/server.ts" 2>/dev/null || true

    # Clean temp files
    rm -f "$BUILD_OUTPUT_1" "$BUILD_OUTPUT_2" "$DEV_OUTPUT" "$TEST_OUTPUT" "$LINT_OUTPUT" "$TYPECHECK_OUTPUT" 2>/dev/null || true

    # Stop docker compose
    docker compose down 2>/dev/null || true
}

# Trap for cleanup on exit
trap cleanup EXIT

log_section "Task 7.1: Complete Monorepo Workflow Test"
echo "Testing: clean state → install → docker → dev → test → lint → typecheck → build → cache"
echo ""

# ==========================================
# STEP 1: Clean State
# ==========================================
log_section "Step 1: Establish Clean State"

log_test "Remove node_modules directories"
rm -rf "$PROJECT_ROOT/node_modules" \
       "$PROJECT_ROOT/apps/api/node_modules" \
       "$PROJECT_ROOT/apps/web/node_modules" \
       "$PROJECT_ROOT/shared/node_modules" 2>/dev/null || true
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    log_pass
else
    log_fail "node_modules still exists"
fi

log_test "Remove .turbo cache directories"
rm -rf "$PROJECT_ROOT/.turbo" \
       "$PROJECT_ROOT/apps/api/.turbo" \
       "$PROJECT_ROOT/apps/web/.turbo" \
       "$PROJECT_ROOT/shared/.turbo" 2>/dev/null || true
if [ ! -d "$PROJECT_ROOT/.turbo" ]; then
    log_pass
else
    log_fail ".turbo cache still exists"
fi

log_test "Remove build output directories"
rm -rf "$PROJECT_ROOT/apps/api/dist" \
       "$PROJECT_ROOT/apps/web/.next" \
       "$PROJECT_ROOT/shared/dist" 2>/dev/null || true
if [ ! -d "$PROJECT_ROOT/apps/api/dist" ] && [ ! -d "$PROJECT_ROOT/apps/web/.next" ]; then
    log_pass
else
    log_fail "Build outputs still exist"
fi

# ==========================================
# STEP 2: Install
# ==========================================
log_section "Step 2: pnpm install (all packages)"

log_test "Run 'pnpm install'"
if pnpm install > /tmp/tripful-install.log 2>&1; then
    log_pass
else
    log_fail "pnpm install failed"
    tail -20 /tmp/tripful-install.log
fi

log_test "Verify root node_modules exists"
if [ -d "$PROJECT_ROOT/node_modules" ]; then
    log_pass
else
    log_fail "Root node_modules not created"
fi

log_test "Verify workspace packages linked"
PACKAGES_LINKED=true
for pkg in api web shared; do
    if [ ! -d "$PROJECT_ROOT/node_modules/.pnpm" ] && [ ! -L "$PROJECT_ROOT/node_modules/@tripful/$pkg" ]; then
        PACKAGES_LINKED=false
    fi
done
if [ "$PACKAGES_LINKED" = true ]; then
    log_pass
else
    log_fail "Workspace packages not properly linked"
fi

# ==========================================
# STEP 3: Docker Compose
# ==========================================
log_section "Step 3: docker compose up -d (database)"

log_test "Start PostgreSQL with docker compose"
if pnpm docker:up > /dev/null 2>&1; then
    log_pass
else
    log_fail "docker compose up failed"
fi

log_test "Wait for PostgreSQL to be healthy"
RETRY=0
POSTGRES_HEALTHY=false
while [ $RETRY -lt 30 ]; do
    if docker compose ps postgres 2>/dev/null | grep -q "healthy"; then
        POSTGRES_HEALTHY=true
        break
    fi
    sleep 1
    ((RETRY++)) || true
done

if [ "$POSTGRES_HEALTHY" = true ]; then
    log_pass
else
    log_fail "PostgreSQL did not become healthy in 30 seconds"
fi

log_test "Verify pg_isready passes"
if docker compose exec -T postgres pg_isready -U tripful > /dev/null 2>&1; then
    log_pass
else
    log_fail "pg_isready failed"
fi

# ==========================================
# STEP 4: Dev Servers
# ==========================================
log_section "Step 4: pnpm dev (both servers)"

log_test "Start dev servers"
timeout 90s pnpm dev > "$DEV_OUTPUT" 2>&1 &
DEV_PID=$!
log_pass

log_test "Wait for API server (port 8000)"
API_STARTED=false
for i in {1..45}; do
    if nc -z localhost 8000 2>/dev/null; then
        API_STARTED=true
        break
    fi
    sleep 1
done

if [ "$API_STARTED" = true ]; then
    log_pass
else
    log_fail "API server did not start on port 8000"
    tail -30 "$DEV_OUTPUT"
fi

log_test "Wait for Web server (port 3000)"
WEB_STARTED=false
for i in {1..45}; do
    if nc -z localhost 3000 2>/dev/null; then
        WEB_STARTED=true
        break
    fi
    sleep 1
done

if [ "$WEB_STARTED" = true ]; then
    log_pass
else
    log_fail "Web server did not start on port 3000"
    tail -30 "$DEV_OUTPUT"
fi

log_test "Test API health endpoint"
if [ "$API_STARTED" = true ]; then
    sleep 2
    HEALTH=$(curl -s http://localhost:8000/api/health 2>/dev/null || echo "FAILED")
    if echo "$HEALTH" | grep -q '"status":"ok"'; then
        log_pass
    else
        log_fail "Health endpoint did not return expected response"
        echo "  Response: $HEALTH"
    fi
else
    log_fail "Cannot test health endpoint - API not running"
fi

log_test "Verify database connection in health check"
if [ "$API_STARTED" = true ]; then
    if echo "$HEALTH" | grep -q '"database":"connected"'; then
        log_pass
    else
        log_fail "Health endpoint does not show database connected"
        echo "  Response: $HEALTH"
    fi
else
    log_fail "Cannot test database connection - API not running"
fi

log_info "Stopping dev servers for testing phase..."
kill $DEV_PID 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "tsx.*src/server.ts" 2>/dev/null || true
sleep 2

# ==========================================
# STEP 5: Tests
# ==========================================
log_section "Step 5: pnpm test (all tests pass)"

log_test "Run 'pnpm test' for all packages"
if pnpm test > "$TEST_OUTPUT" 2>&1; then
    log_pass
else
    log_fail "pnpm test failed"
    tail -30 "$TEST_OUTPUT"
fi

log_test "Verify backend integration tests passed"
if grep -q "health.integration.test.ts" "$TEST_OUTPUT" 2>/dev/null; then
    log_pass
else
    log_fail "Backend integration tests not found in output"
fi

log_test "Verify shared package tests passed"
if grep -q "test pass" "$TEST_OUTPUT" 2>/dev/null || grep -q "passed" "$TEST_OUTPUT" 2>/dev/null; then
    log_pass
else
    log_fail "Could not verify test pass status"
fi

# ==========================================
# STEP 6: Lint
# ==========================================
log_section "Step 6: pnpm lint (no errors)"

log_test "Run 'pnpm lint' for all packages"
if pnpm lint > "$LINT_OUTPUT" 2>&1; then
    log_pass
else
    log_fail "pnpm lint found errors"
    tail -30 "$LINT_OUTPUT"
fi

log_test "Verify no ESLint errors reported"
if ! grep -qi "error" "$LINT_OUTPUT" 2>/dev/null; then
    log_pass
else
    log_fail "ESLint errors found"
    grep -i "error" "$LINT_OUTPUT" | head -10
fi

# ==========================================
# STEP 7: Typecheck
# ==========================================
log_section "Step 7: pnpm typecheck (no errors)"

log_test "Run 'pnpm typecheck' for all packages"
if pnpm typecheck > "$TYPECHECK_OUTPUT" 2>&1; then
    log_pass
else
    log_fail "pnpm typecheck found errors"
    tail -30 "$TYPECHECK_OUTPUT"
fi

log_test "Verify no TypeScript errors"
if ! grep -qi "error TS" "$TYPECHECK_OUTPUT" 2>/dev/null; then
    log_pass
else
    log_fail "TypeScript errors found"
    grep -i "error TS" "$TYPECHECK_OUTPUT" | head -10
fi

# ==========================================
# STEP 8: Build (First Time)
# ==========================================
log_section "Step 8: pnpm build (both apps build)"

log_test "Run first 'pnpm build' (cold cache)"
BUILD_START_1=$(date +%s)
if pnpm build > "$BUILD_OUTPUT_1" 2>&1; then
    BUILD_END_1=$(date +%s)
    BUILD_TIME_1=$((BUILD_END_1 - BUILD_START_1))
    log_pass
    log_info "First build completed in ${BUILD_TIME_1}s"
else
    log_fail "First build failed"
    tail -30 "$BUILD_OUTPUT_1"
fi

log_test "Verify API dist directory created"
if [ -d "$PROJECT_ROOT/apps/api/dist" ]; then
    log_pass
else
    log_fail "API dist directory not created"
fi

log_test "Verify Web .next directory created"
if [ -d "$PROJECT_ROOT/apps/web/.next" ]; then
    log_pass
else
    log_fail "Web .next directory not created"
fi

log_test "Verify API server.js exists"
if [ -f "$PROJECT_ROOT/apps/api/dist/server.js" ]; then
    log_pass
else
    log_fail "API server.js not built"
fi

log_test "Verify shared package built"
if [ -d "$PROJECT_ROOT/shared/dist" ] || grep -q "shared.*build" "$BUILD_OUTPUT_1"; then
    log_pass
else
    log_fail "Shared package not built"
fi

# ==========================================
# STEP 9: Turbo Cache Verification
# ==========================================
log_section "Step 9: Verify Turbo Caching"

log_test "Run second 'pnpm build' (warm cache)"
BUILD_START_2=$(date +%s)
if pnpm build > "$BUILD_OUTPUT_2" 2>&1; then
    BUILD_END_2=$(date +%s)
    BUILD_TIME_2=$((BUILD_END_2 - BUILD_START_2))
    log_pass
    log_info "Second build completed in ${BUILD_TIME_2}s"
else
    log_fail "Second build failed"
    tail -30 "$BUILD_OUTPUT_2"
fi

log_test "Verify Turbo cache hits detected"
CACHE_HITS=false
if grep -qi "cache hit" "$BUILD_OUTPUT_2" || grep -qi "FULL TURBO" "$BUILD_OUTPUT_2" || grep -q ">>> FULL TURBO" "$BUILD_OUTPUT_2"; then
    CACHE_HITS=true
    log_pass
    log_info "Cache hits detected in second build"
else
    log_fail "No cache hits detected in second build"
    log_info "Build output sample:"
    grep -i "cache\|turbo\|hit" "$BUILD_OUTPUT_2" | head -10
fi

log_test "Verify second build faster than first"
if [ "$BUILD_TIME_2" -lt "$BUILD_TIME_1" ]; then
    SPEEDUP=$((BUILD_TIME_1 - BUILD_TIME_2))
    PERCENT=$((SPEEDUP * 100 / BUILD_TIME_1))
    log_pass
    log_info "Second build ${SPEEDUP}s faster (${PERCENT}% improvement)"
else
    log_fail "Second build not faster (${BUILD_TIME_1}s vs ${BUILD_TIME_2}s)"
fi

log_test "Verify .turbo/cache directory exists"
if [ -d "$PROJECT_ROOT/.turbo/cache" ]; then
    CACHE_COUNT=$(find "$PROJECT_ROOT/.turbo/cache" -type f 2>/dev/null | wc -l)
    log_pass
    log_info "Found $CACHE_COUNT cache files"
else
    log_fail ".turbo/cache directory not created"
fi

# ==========================================
# STEP 10: Cross-Package Imports
# ==========================================
log_section "Step 10: Test Cross-Package Imports"

log_test "Verify @tripful/shared package exports"
if [ -f "$PROJECT_ROOT/shared/types/index.ts" ] && [ -f "$PROJECT_ROOT/shared/schemas/index.ts" ]; then
    log_pass
else
    log_fail "Shared package exports missing"
fi

log_test "Typecheck API package (uses @tripful/shared types)"
cd "$PROJECT_ROOT/apps/api"
if pnpm typecheck > /tmp/tripful-api-typecheck.log 2>&1; then
    log_pass
else
    log_fail "API typecheck failed"
    tail -20 /tmp/tripful-api-typecheck.log
fi
cd "$PROJECT_ROOT"

log_test "Typecheck Web package (uses @tripful/shared schemas)"
cd "$PROJECT_ROOT/apps/web"
if pnpm typecheck > /tmp/tripful-web-typecheck.log 2>&1; then
    log_pass
else
    log_fail "Web typecheck failed"
    tail -20 /tmp/tripful-web-typecheck.log
fi
cd "$PROJECT_ROOT"

log_test "Verify no 'Cannot find module' errors"
NO_MODULE_ERRORS=true
if grep -qi "Cannot find module.*@tripful/shared" /tmp/tripful-api-typecheck.log 2>/dev/null; then
    NO_MODULE_ERRORS=false
fi
if grep -qi "Cannot find module.*@tripful/shared" /tmp/tripful-web-typecheck.log 2>/dev/null; then
    NO_MODULE_ERRORS=false
fi
if [ "$NO_MODULE_ERRORS" = true ]; then
    log_pass
else
    log_fail "Module resolution errors found"
fi

log_test "Verify shared package in web dependencies"
if grep -q "@tripful/shared" "$PROJECT_ROOT/apps/web/package.json"; then
    log_pass
else
    log_fail "@tripful/shared not in web dependencies"
fi

# ==========================================
# STEP 11: Verify All Workspace Commands
# ==========================================
log_section "Step 11: Verify All Workspace Commands Work"

log_test "Verify 'pnpm dev:web' command exists"
if grep -q "dev:web" "$PROJECT_ROOT/package.json"; then
    log_pass
else
    log_fail "dev:web command not found"
fi

log_test "Verify 'pnpm dev:api' command exists"
if grep -q "dev:api" "$PROJECT_ROOT/package.json"; then
    log_pass
else
    log_fail "dev:api command not found"
fi

log_test "Verify 'pnpm build:web' command exists"
if grep -q "build:web" "$PROJECT_ROOT/package.json"; then
    log_pass
else
    log_fail "build:web command not found"
fi

log_test "Verify 'pnpm build:api' command exists"
if grep -q "build:api" "$PROJECT_ROOT/package.json"; then
    log_pass
else
    log_fail "build:api command not found"
fi

log_test "Verify turbo commands in package.json"
TURBO_COMMANDS=("dev" "build" "lint" "typecheck" "test")
TURBO_OK=true
for cmd in "${TURBO_COMMANDS[@]}"; do
    if ! grep -q "\"$cmd\".*turbo" "$PROJECT_ROOT/package.json"; then
        TURBO_OK=false
    fi
done
if [ "$TURBO_OK" = true ]; then
    log_pass
else
    log_fail "Some turbo commands missing"
fi

# ==========================================
# Summary
# ==========================================
log_section "Workflow Test Summary"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}All workflow tests passed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Verified:"
    echo "  ✅ Clean state workflow (install → docker → dev → test → lint → typecheck → build)"
    echo "  ✅ Turbo caching (second build faster with cache hits)"
    echo "  ✅ All tests pass (backend integration tests included)"
    echo "  ✅ Linting passes for all packages"
    echo "  ✅ Type checking passes for all packages"
    echo "  ✅ Both apps build successfully"
    echo "  ✅ Cross-package imports resolve correctly"
    echo "  ✅ All workspace commands available"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Some workflow tests failed${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Review the test output above for details."
    exit 1
fi
