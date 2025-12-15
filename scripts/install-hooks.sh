#!/bin/bash

# Install Git hooks for automated test checking
# Run with: bash scripts/install-hooks.sh

HOOK_DIR=".git/hooks"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📦 Installing Git hooks..."

# Create pre-commit hook
cat > "$HOOK_DIR/pre-commit" << 'EOF'
#!/bin/bash

# Pre-commit hook to check for missing tests
# Runs automatically before each commit

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Colour

echo "🔍 Checking for missing tests..."

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

# Arrays to store files without tests
MISSING_TESTS=()

# Check each staged file
for FILE in $STAGED_FILES; do
  # Skip non-code files
  if [[ ! "$FILE" =~ \.(ts|tsx)$ ]]; then
    continue
  fi

  # Skip test files themselves
  if [[ "$FILE" =~ \.test\.(ts|tsx)$ ]] || [[ "$FILE" =~ __tests__ ]]; then
    continue
  fi

  # Skip config files
  if [[ "$FILE" =~ \.config\.(ts|js)$ ]] || [[ "$FILE" == "vite.config.ts" ]] || [[ "$FILE" == "vitest.config.ts" ]]; then
    continue
  fi

  # Skip main.tsx and other entry points
  if [[ "$FILE" == "src/main.tsx" ]] || [[ "$FILE" == "src/App.tsx" ]]; then
    continue
  fi

  # Skip type definition files
  if [[ "$FILE" =~ \.d\.ts$ ]]; then
    continue
  fi

  # Determine expected test file location
  FILENAME=$(basename "$FILE" .tsx)
  FILENAME=$(basename "$FILENAME" .ts)
  FILEDIR=$(dirname "$FILE")

  # For components, tests should be in __tests__ directory
  if [[ "$FILE" =~ src/components/ ]]; then
    TEST_FILE="${FILEDIR}/__tests__/${FILENAME}.test.tsx"
  elif [[ "$FILE" =~ supabase/functions/ ]]; then
    TEST_FILE="tests/${FILENAME}.test.ts"
  else
    TEST_FILE="${FILEDIR}/__tests__/${FILENAME}.test.ts"
  fi

  # Check if test file exists
  if [[ ! -f "$TEST_FILE" ]]; then
    MISSING_TESTS+=("$FILE -> $TEST_FILE")
  fi
done

# Report findings
if [ ${#MISSING_TESTS[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ All new/modified files have tests!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Warning: The following files don't have tests:${NC}"
  echo ""
  for ITEM in "${MISSING_TESTS[@]}"; do
    echo "  - $ITEM"
  done
  echo ""
  echo -e "${YELLOW}💡 Generate test files with:${NC}"
  for ITEM in "${MISSING_TESTS[@]}"; do
    FILE=$(echo "$ITEM" | cut -d' ' -f1)
    echo "  node scripts/generate-test.js $FILE"
  done
  echo ""
  echo -e "${YELLOW}Or continue without tests (not recommended):${NC}"
  echo "  git commit --no-verify"
  echo ""

  # Ask user if they want to continue
  read -p "Continue commit without tests? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Commit cancelled. Please add tests and try again.${NC}"
    exit 1
  fi
fi

exit 0
EOF

# Make the hook executable
chmod +x "$HOOK_DIR/pre-commit"

echo "✅ Git hooks installed successfully!"
echo ""
echo "The pre-commit hook will now:"
echo "  • Check for missing tests on every commit"
echo "  • Suggest commands to generate test files"
echo "  • Allow bypassing with --no-verify if needed"
echo ""
echo "To bypass the hook once: git commit --no-verify"
echo "To uninstall: rm .git/hooks/pre-commit"
