#!/bin/bash

# Test runner script for authentication and bot protection tests
# Usage: ./scripts/test-auth.sh [unit|integration|e2e|all]

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Authentication & Bot Protection Tests${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Default to all if no argument provided
TEST_TYPE="${1:-all}"

case $TEST_TYPE in
  unit)
    echo -e "${YELLOW}Running Unit Tests...${NC}"
    npx vitest run tests/unit/auth/
    ;;

  integration)
    echo -e "${YELLOW}Running Integration Tests...${NC}"
    npx vitest run tests/integration/api/chat-route.test.ts \
      tests/integration/api/search-route.test.ts \
      tests/integration/api/verify-bar-route.test.ts
    ;;

  e2e)
    echo -e "${YELLOW}Running E2E Tests...${NC}"
    npx playwright test tests/e2e/auth/
    ;;

  all)
    echo -e "${YELLOW}Running All Auth Tests...${NC}"
    echo ""

    echo -e "${GREEN}1/3 Unit Tests${NC}"
    npx vitest run tests/unit/auth/
    echo ""

    echo -e "${GREEN}2/3 Integration Tests${NC}"
    npx vitest run tests/integration/api/chat-route.test.ts \
      tests/integration/api/search-route.test.ts \
      tests/integration/api/verify-bar-route.test.ts
    echo ""

    echo -e "${GREEN}3/3 E2E Tests${NC}"
    npx playwright test tests/e2e/auth/
    ;;

  *)
    echo -e "${YELLOW}Invalid option: $TEST_TYPE${NC}"
    echo "Usage: $0 [unit|integration|e2e|all]"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}✓ Tests completed successfully!${NC}"
