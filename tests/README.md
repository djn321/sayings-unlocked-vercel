# Test Suite Documentation

This directory contains automated tests for the Sayings Unlocked application.

## 🚀 Automated Test Generation

**New functionality automatically gets test templates!**

### Quick Start

1. **Install Git hooks** (one-time setup):
```bash
bun install-hooks
```

2. **Create a new component/function**:
```bash
# Your new file
touch src/components/MyNewComponent.tsx
```

3. **Generate test automatically**:
```bash
bun generate-test src/components/MyNewComponent.tsx
```

4. **Or let the pre-commit hook remind you**:
- When you commit, the hook checks for missing tests
- It suggests the exact command to generate them
- You can bypass with `--no-verify` if needed (not recommended)

### How It Works

The system includes:
- **Test Generator** (`scripts/generate-test.js`) - Creates test templates
- **Pre-commit Hook** - Checks for missing tests before commits
- **Smart Detection** - Knows where to place tests based on file type

**Example workflow:**
```bash
# 1. Create new component
touch src/components/UserProfile.tsx

# 2. Generate test template
bun generate-test src/components/UserProfile.tsx
# ✅ Test file created: src/components/__tests__/UserProfile.test.tsx

# 3. Fill in test cases
# The template includes common test scenarios to fill in

# 4. Commit both together
git add src/components/UserProfile.tsx src/components/__tests__/UserProfile.test.tsx
git commit -m "Add UserProfile component with tests"
```

### Test Templates

Generated tests include:
- ✅ Basic rendering test
- ✅ User interaction tests
- ✅ Error handling tests
- ✅ Loading state tests
- ✅ Mocked dependencies
- ✅ Proper imports and setup

## Test Types

### 1. Unit & Integration Tests (`tests/edge-functions.test.ts`)

Tests for edge function logic and database interactions. These verify:
- Subscription flow (create, confirm)
- Feedback recording
- Unsubscribe functionality
- Security (token validation, RLS policies)
- Error handling

### 2. Component Tests (`src/components/__tests__/`)

React component tests using Vitest and React Testing Library:
- SubscriptionForm validation
- Form submission handling
- Error states
- Loading states

### 3. Smoke Tests (`tests/smoke-tests.sh`)

Production health checks that verify:
- All edge function endpoints are reachable
- Security measures are in place (invalid tokens rejected)
- Frontend pages load correctly

## Running Tests

### Local Development

```bash
# Install dependencies
bun install

# Run all unit tests once
bun test

# Run tests in watch mode (auto-rerun on file changes)
bun test:watch

# Run tests with coverage report
bun test:coverage

# Open interactive test UI
bun test:ui

# Run smoke tests against production
bun smoke-test
```

### CI/CD

Tests run automatically on:
- Every push to main branch
- Every pull request
- Before deployment

GitHub Actions workflows:
- `.github/workflows/test.yml` - Unit, integration, and smoke tests
- `.github/workflows/deploy-supabase.yml` - Deployment pipeline

## Test Structure

```
tests/
├── README.md                    # This file
├── setup.ts                     # Test environment configuration
├── edge-functions.test.ts       # Edge function integration tests
└── smoke-tests.sh               # Production smoke tests

src/
└── components/
    └── __tests__/
        └── SubscriptionForm.test.tsx  # Component tests
```

## Writing New Tests

### Unit Tests

Create test files next to the code they test with `.test.ts` or `.test.tsx` extension:

```typescript
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

it('should render correctly', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

## Regression Testing Strategy

Critical flows covered:
1. **Subscription Flow** - New user signs up and confirms email
2. **Feedback** - User clicks like/dislike on etymology
3. **Unsubscribe** - User unsubscribes from emails
4. **Security** - Token validation, CORS, RLS policies

Any changes to these flows should have corresponding tests updated.

## Coverage Goals

- **Critical paths**: 100% coverage
- **Edge functions**: 80%+ coverage
- **Components**: 70%+ coverage
- **Overall**: 60%+ coverage

View coverage report: `bun test:coverage` then open `coverage/index.html`

## Troubleshooting

### Tests fail locally but pass in CI
- Check environment variables are set correctly
- Ensure you're using the same Node/Bun version as CI

### Smoke tests fail
- Check if production services are down
- Verify SUPABASE_URL and SITE_URL are correct
- Check if edge functions are deployed

### Component tests fail
- Clear test cache: `rm -rf node_modules/.vitest`
- Reinstall dependencies: `bun install`

## Best Practices

1. **Keep tests fast** - Mock external dependencies
2. **Test behaviour, not implementation** - Focus on what users see/do
3. **One assertion per test** - Makes failures easy to diagnose
4. **Descriptive test names** - Should read like documentation
5. **Arrange-Act-Assert** - Clear test structure

## Continuous Improvement

When bugs are found:
1. Write a failing test that reproduces the bug
2. Fix the bug
3. Verify the test now passes
4. Commit both test and fix together

This ensures the bug doesn't regress in the future.
