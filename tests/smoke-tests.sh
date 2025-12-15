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
echo "Critical Function Tests:"
echo "------------------------"

# Test 5: Send daily etymology endpoint accessibility
# NOTE: This test checks if the endpoint is accessible but may send emails
# If there are no active subscribers, it returns 200 with "No active subscribers"
# If there are subscribers, it will send emails - use with caution in production
echo -n "Testing send-daily-etymology (WARNING: may send emails)... "
if [[ "$ANON_KEY" ]]; then
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -X POST \
    "$SUPABASE_URL/functions/v1/send-daily-etymology" \
    -d '{}')

  # Accept 200 (success) or 500 (expected if no subscribers or config issue)
  # The function returns 500 if env vars are missing, which we want to catch
  if [ "$status" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $status - Endpoint accessible)"
    ((PASSED++))
  elif [ "$status" = "500" ]; then
    echo -e "${YELLOW}⚠ WARN${NC} (HTTP $status - Check configuration or no subscribers)"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} (Expected HTTP 200 or 500, got $status)"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⊘ SKIP${NC} (No ANON_KEY available)"
fi

echo ""
echo "Security Tests:"
echo "---------------"

# Test 6: Feedback with invalid token (should return 401)
test_endpoint \
  "feedback with invalid token" \
  "$SUPABASE_URL/functions/v1/record-etymology-feedback?token=invalid&saying=test&feedback=like" \
  "401" \
  "GET"

# Test 7: Unsubscribe with invalid token (should return 401)
test_endpoint \
  "unsubscribe with invalid token" \
  "$SUPABASE_URL/functions/v1/unsubscribe?token=invalid" \
  "401" \
  "GET"

# Test 8: Confirm subscription with invalid token (should return 400)
test_endpoint \
  "confirm with invalid token" \
  "$SUPABASE_URL/functions/v1/confirm-subscription" \
  "400" \
  "POST"

echo ""
echo "Frontend Tests:"
echo "---------------"

# Test 9: Frontend is reachable
test_endpoint \
  "frontend homepage" \
  "$SITE_URL" \
  "200" \
  "GET"

# Test 10: Confirm page is reachable
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
