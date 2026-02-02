#!/bin/bash
# Unit tests for test-workflow.sh script structure

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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKFLOW_SCRIPT="$PROJECT_ROOT/scripts/test-workflow.sh"

echo "========================================"
echo "test-workflow.sh Structure Tests"
echo "========================================"
echo ""

# Test: Script exists
log_test "test-workflow.sh script exists"
if [ -f "$WORKFLOW_SCRIPT" ]; then
    log_pass
else
    log_fail "Script not found at $WORKFLOW_SCRIPT"
    exit 1
fi

# Test: Script is executable
log_test "Script has executable permissions"
if [ -x "$WORKFLOW_SCRIPT" ]; then
    log_pass
else
    log_fail "Script is not executable"
fi

# Test: Has shebang
log_test "Script has proper shebang"
if head -1 "$WORKFLOW_SCRIPT" | grep -q "^#!/bin/bash"; then
    log_pass
else
    log_fail "Missing or incorrect shebang"
fi

# Test: Has color definitions
log_test "Script has color definitions"
COLOR_OK=true
for color in RED GREEN YELLOW BLUE NC; do
    if ! grep -q "^$color=" "$WORKFLOW_SCRIPT"; then
        COLOR_OK=false
    fi
done
if [ "$COLOR_OK" = true ]; then
    log_pass
else
    log_fail "Missing color definitions"
fi

# Test: Has test tracking variables
log_test "Script has test tracking variables"
if grep -q "TESTS_PASSED=0" "$WORKFLOW_SCRIPT" && grep -q "TESTS_FAILED=0" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing test tracking variables"
fi

# Test: Has dynamic path resolution
log_test "Script uses dynamic path resolution"
if grep -q 'SCRIPT_DIR=.*dirname.*BASH_SOURCE' "$WORKFLOW_SCRIPT" && grep -q 'PROJECT_ROOT=' "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing dynamic path resolution"
fi

# Test: Has cleanup function
log_test "Script has cleanup function"
if grep -q "^cleanup()" "$WORKFLOW_SCRIPT" || grep -q "cleanup() {" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing cleanup function"
fi

# Test: Has trap for cleanup
log_test "Script has trap for cleanup on exit"
if grep -q "trap cleanup EXIT" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing trap for cleanup"
fi

# Test: Tests clean state
log_test "Script tests clean state (remove node_modules, .turbo, dist)"
CLEAN_OK=true
if ! grep -q "rm -rf.*node_modules" "$WORKFLOW_SCRIPT"; then
    CLEAN_OK=false
fi
if ! grep -q "rm -rf.*\.turbo" "$WORKFLOW_SCRIPT"; then
    CLEAN_OK=false
fi
if ! grep -q "rm -rf.*dist\|rm -rf.*\.next" "$WORKFLOW_SCRIPT"; then
    CLEAN_OK=false
fi
if [ "$CLEAN_OK" = true ]; then
    log_pass
else
    log_fail "Missing clean state tests"
fi

# Test: Tests pnpm install
log_test "Script tests pnpm install"
if grep -q "pnpm install" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing pnpm install test"
fi

# Test: Tests docker compose
log_test "Script tests docker compose up"
if grep -q "docker compose up\|docker:up" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing docker compose test"
fi

# Test: Tests PostgreSQL health
log_test "Script tests PostgreSQL health with retry logic"
if grep -q "pg_isready\|healthy" "$WORKFLOW_SCRIPT" && grep -q "RETRY\|while.*MAX_RETRIES" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing PostgreSQL health test or retry logic"
fi

# Test: Tests dev servers
log_test "Script tests dev servers (both web and api)"
if grep -q "pnpm dev" "$WORKFLOW_SCRIPT" && grep -q "8000" "$WORKFLOW_SCRIPT" && grep -q "3000" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing dev servers test"
fi

# Test: Uses nc for port checking
log_test "Script uses nc for port checking"
if grep -q "nc -z" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing nc port checking"
fi

# Test: Tests health endpoint
log_test "Script tests API health endpoint"
if grep -q "curl.*health" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing health endpoint test"
fi

# Test: Tests pnpm test
log_test "Script tests pnpm test"
if grep -q "pnpm test" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing pnpm test"
fi

# Test: Tests pnpm lint
log_test "Script tests pnpm lint"
if grep -q "pnpm lint" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing pnpm lint test"
fi

# Test: Tests pnpm typecheck
log_test "Script tests pnpm typecheck"
if grep -q "pnpm typecheck" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing pnpm typecheck test"
fi

# Test: Tests first build
log_test "Script tests first build (cold cache)"
if grep -q "pnpm build" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing build test"
fi

# Test: Verifies build outputs
log_test "Script verifies build outputs (dist, .next)"
if grep -q "dist\|\.next" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing build output verification"
fi

# Test: Tests second build for caching
log_test "Script tests second build for Turbo caching"
BUILD_COUNT=$(grep -c "pnpm build" "$WORKFLOW_SCRIPT")
if [ "$BUILD_COUNT" -ge 2 ]; then
    log_pass
else
    log_fail "Script should run build twice for cache testing"
fi

# Test: Checks for cache hits
log_test "Script checks for cache hits in second build"
if grep -qi "cache hit\|FULL TURBO" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing cache hit verification"
fi

# Test: Times builds for comparison
log_test "Script times builds for comparison"
if grep -q "date +%s\|BUILD_TIME\|BUILD_START" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing build timing"
fi

# Test: Tests cross-package imports
log_test "Script tests cross-package imports"
if grep -q "@tripful/shared\|cross-package" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing cross-package import test"
fi

# Test: Uses output redirection
log_test "Script redirects output to temp files"
if grep -q "/tmp/.*\.log" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing output redirection"
fi

# Test: Has summary section
log_test "Script has summary section"
if grep -qi "summary\|Total Tests" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing summary section"
fi

# Test: Exits with proper codes
log_test "Script exits with proper exit codes"
if grep -q "exit 0" "$WORKFLOW_SCRIPT" && grep -q "exit 1" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing proper exit codes"
fi

# Test: Uses || true for increment operations
log_test "Script uses || true for safe increments"
if grep -q "((TESTS_PASSED++)) || true" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing || true for safe operations"
fi

# Test: Cleans up processes on exit
log_test "Script cleans up processes (pkill)"
if grep -q "pkill" "$WORKFLOW_SCRIPT"; then
    log_pass
else
    log_fail "Missing process cleanup"
fi

# Test: Has all 11 steps documented
log_test "Script has all workflow steps documented"
STEP_COUNT=$(grep -c "Step [0-9]\+:" "$WORKFLOW_SCRIPT")
if [ "$STEP_COUNT" -ge 10 ]; then
    log_pass
else
    log_fail "Expected at least 10 steps, found $STEP_COUNT"
fi

# Summary
echo ""
echo "========================================"
echo "Structure Test Results"
echo "========================================"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo "========================================"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All structure tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some structure tests failed.${NC}"
    exit 1
fi
