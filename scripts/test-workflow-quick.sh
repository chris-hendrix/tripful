#!/bin/bash
# Quick workflow test (skips clean state and install)
# Use this for faster iteration during development

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

# Temp files
BUILD_OUTPUT_1="/tmp/tripful-quick-build-1.log"
BUILD_OUTPUT_2="/tmp/tripful-quick-build-2.log"

# Cleanup function
cleanup() {
    log_info "Cleaning up temp files..."
    rm -f "$BUILD_OUTPUT_1" "$BUILD_OUTPUT_2" 2>/dev/null || true
}

trap cleanup EXIT

log_section "Quick Workflow Test (No Clean/Install)"
echo "Testing: lint → typecheck → test → build → cache"
echo ""

# ==========================================
# Quick Tests
# ==========================================
log_section "Step 1: pnpm lint"

log_test "Run 'pnpm lint' for all packages"
if pnpm lint > /tmp/tripful-quick-lint.log 2>&1; then
    log_pass
else
    log_fail "pnpm lint found errors"
    tail -20 /tmp/tripful-quick-lint.log
fi

log_section "Step 2: pnpm typecheck"

log_test "Run 'pnpm typecheck' for all packages"
if pnpm typecheck > /tmp/tripful-quick-typecheck.log 2>&1; then
    log_pass
else
    log_fail "pnpm typecheck found errors"
    tail -20 /tmp/tripful-quick-typecheck.log
fi

log_section "Step 3: pnpm test"

log_test "Run 'pnpm test' for all packages"
if pnpm test > /tmp/tripful-quick-test.log 2>&1; then
    log_pass
else
    log_fail "pnpm test failed"
    tail -20 /tmp/tripful-quick-test.log
fi

log_section "Step 4: First build"

log_test "Clear .turbo cache"
rm -rf "$PROJECT_ROOT/.turbo/cache" 2>/dev/null || true
log_pass

log_test "Run first 'pnpm build'"
BUILD_START_1=$(date +%s)
if pnpm build > "$BUILD_OUTPUT_1" 2>&1; then
    BUILD_END_1=$(date +%s)
    BUILD_TIME_1=$((BUILD_END_1 - BUILD_START_1))
    log_pass
    log_info "First build: ${BUILD_TIME_1}s"
else
    log_fail "First build failed"
    tail -20 "$BUILD_OUTPUT_1"
fi

log_section "Step 5: Second build (cache test)"

log_test "Run second 'pnpm build'"
BUILD_START_2=$(date +%s)
if pnpm build > "$BUILD_OUTPUT_2" 2>&1; then
    BUILD_END_2=$(date +%s)
    BUILD_TIME_2=$((BUILD_END_2 - BUILD_START_2))
    log_pass
    log_info "Second build: ${BUILD_TIME_2}s"
else
    log_fail "Second build failed"
    tail -20 "$BUILD_OUTPUT_2"
fi

log_test "Verify cache hits in second build"
if grep -qi "cache hit\|FULL TURBO\|>>> FULL TURBO" "$BUILD_OUTPUT_2"; then
    log_pass
    log_info "Cache hits detected"
else
    log_fail "No cache hits detected"
fi

log_test "Verify second build faster than first"
if [ "$BUILD_TIME_2" -lt "$BUILD_TIME_1" ]; then
    SPEEDUP=$((BUILD_TIME_1 - BUILD_TIME_2))
    PERCENT=$((SPEEDUP * 100 / BUILD_TIME_1))
    log_pass
    log_info "Speedup: ${SPEEDUP}s (${PERCENT}%)"
else
    log_fail "Second build not faster"
fi

# Summary
log_section "Quick Test Summary"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All quick tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
