#!/bin/bash

# Smoke tests for critical edge function endpoints
# These tests verify that endpoints are reachable and return expected status codes
# Run with: bash tests/smoke-tests.sh

SUPABASE_URL="${SUPABASE_URL:-https://vmsdalzjlkuilzcetztv.supabase.co}"
SITE_URL="${SITE_URL:-https://sayings-unlocked.vercel.app}"

# Load anon key from .env file
if [ -f .env ]; then
  ANON_KEY=$(grep VITE_SUPABASE_PUBLISHABLE_KEY .env | cut -d'"' -f2)
fi

if [ -z "$ANON_KEY" ]; then
  echo "⚠️  Warning: ANON_KEY not found in .env file"
  echo "GET requests may fail without authentication"
fi

echo "🧪 Running smoke tests against $SUPABASE_URL"
echo "================================================"

# Colours for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Colour

# Test counter
PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
  local name=$1
  local url=$2
  local expected_status=$3
  local method=${4:-GET}

  echo -n "Testing $name... "

  # Add auth headers for GET requests to Supabase edge functions
  if [[ "$method" == "GET" ]] && [[ "$url" == *"supabase"* ]] && [[ -n "$ANON_KEY" ]]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" \
      -H "apikey: $ANON_KEY" \
      -H "Authorization: Bearer $ANON_KEY" \
      -X "$method" "$url")
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url")
  fi

  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $status)"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got $status)"
    ((FAILED++))
  fi
}

echo ""
echo "Edge Function Accessibility Tests:"
echo "-----------------------------------"

# Test 1: Confirm subscription with missing token (should return 400)
test_endpoint \
  "confirm-subscription (missing params)" \
  "$SUPABASE_URL/functions/v1/confirm-subscription" \
  "400" \
  "POST"

# Test 2: Record feedback with missing params (should return 400)
test_endpoint \
  "record-etymology-feedback (missing params)" \
  "$SUPABASE_URL/functions/v1/record-etymology-feedback" \
  "400" \
  "GET"

# Test 3: Unsubscribe with missing token (should return 400)
test_endpoint \
  "unsubscribe (missing params)" \
  "$SUPABASE_URL/functions/v1/unsubscribe" \
  "400" \
  "GET"

# Test 4: Send confirmation email with missing params (should return 400)
test_endpoint \
  "send-confirmation-email (missing params)" \
  "$SUPABASE_URL/functions/v1/send-confirmation-email" \
  "400" \
  "POST"

echo ""
echo "Security Tests:"
echo "---------------"

# Test 5: Feedback with invalid token (should return 401)
test_endpoint \
  "feedback with invalid token" \
  "$SUPABASE_URL/functions/v1/record-etymology-feedback?token=invalid&saying=test&feedback=like" \
  "401" \
  "GET"

# Test 6: Unsubscribe with invalid token (should return 401)
test_endpoint \
  "unsubscribe with invalid token" \
  "$SUPABASE_URL/functions/v1/unsubscribe?token=invalid" \
  "401" \
  "GET"

# Test 7: Confirm subscription with invalid token (should return 400)
test_endpoint \
  "confirm with invalid token" \
  "$SUPABASE_URL/functions/v1/confirm-subscription" \
  "400" \
  "POST"

echo ""
echo "Frontend Tests:"
echo "---------------"

# Test 8: Frontend is reachable
test_endpoint \
  "frontend homepage" \
  "$SITE_URL" \
  "200" \
  "GET"

# Test 9: Confirm page is reachable
test_endpoint \
  "confirm page" \
  "$SITE_URL/confirm" \
  "200" \
  "GET"

echo ""
echo "================================================"
echo "Test Results:"
echo -e "${GREEN}Passed: $PASSED${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Failed: $FAILED${NC}"
  echo ""
  echo "❌ Some tests failed!"
  exit 1
else
  echo -e "${YELLOW}Failed: $FAILED${NC}"
  echo ""
  echo "✅ All smoke tests passed!"
  exit 0
fi
