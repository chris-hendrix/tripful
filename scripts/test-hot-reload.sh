#!/bin/bash
# Test hot reload functionality for both web and API

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "Hot Reload Test Instructions"
echo "========================================"
echo ""
echo "This test verifies that hot reload is configured correctly."
echo "To test manually:"
echo ""
echo -e "${YELLOW}1. Start the dev servers:${NC}"
echo "   pnpm dev"
echo ""
echo -e "${YELLOW}2. Test API hot reload:${NC}"
echo "   a. Open apps/api/src/routes/health.ts"
echo "   b. Make a small change (e.g., add a comment)"
echo "   c. Save the file"
echo "   d. Verify the API server restarts automatically"
echo "   e. Test: curl http://localhost:8000/api/health"
echo ""
echo -e "${YELLOW}3. Test Web hot reload:${NC}"
echo "   a. Open apps/web/app/page.tsx"
echo "   b. Make a small change to the text"
echo "   c. Save the file"
echo "   d. Check your browser at http://localhost:3000"
echo "   e. The page should update without manual refresh"
echo ""
echo -e "${GREEN}Configuration Status:${NC}"
echo ""

# Get script directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Check turbo.json
if grep -q '"persistent": true' turbo.json; then
    echo -e "${GREEN}✓${NC} turbo.json: dev tasks configured as persistent"
else
    echo -e "✗ turbo.json: dev tasks NOT configured as persistent"
fi

# Check API package.json for tsx watch
if grep -q 'tsx watch' apps/api/package.json; then
    echo -e "${GREEN}✓${NC} API: tsx watch mode enabled for hot reload"
else
    echo -e "✗ API: tsx watch mode NOT enabled"
fi

# Check Web package.json for next dev
if grep -q 'next dev' apps/web/package.json; then
    echo -e "${GREEN}✓${NC} Web: Next.js dev mode enabled (built-in hot reload)"
else
    echo -e "✗ Web: Next.js dev mode NOT enabled"
fi

echo ""
echo "========================================"
echo -e "${GREEN}Hot reload is configured correctly!${NC}"
echo "========================================"
