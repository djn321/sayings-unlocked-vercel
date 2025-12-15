#!/usr/bin/env node

/**
 * Test Generator Script
 * Automatically creates test files for new components or functions
 *
 * Usage:
 *   node scripts/generate-test.js <file-path>
 *   node scripts/generate-test.js src/components/MyComponent.tsx
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function generateComponentTest(componentPath, componentName) {
  return `/**
 * Tests for ${componentName}
 * Auto-generated test template - fill in with actual test cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ${componentName} } from '../${componentName}';

// Mock dependencies as needed
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  }
}));

describe('${componentName}', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<${componentName} />);
    // Add assertions based on what should be visible
    expect(true).toBe(true); // Replace with actual test
  });

  it('should handle user interactions', async () => {
    render(<${componentName} />);

    // TODO: Add interaction tests
    // Example:
    // const button = screen.getByRole('button');
    // fireEvent.click(button);
    // await waitFor(() => {
    //   expect(screen.getByText('Expected Result')).toBeInTheDocument();
    // });

    expect(true).toBe(true); // Replace with actual test
  });

  it('should handle error states', async () => {
    // TODO: Test error handling
    expect(true).toBe(true); // Replace with actual test
  });

  it('should handle loading states', async () => {
    // TODO: Test loading states
    expect(true).toBe(true); // Replace with actual test
  });
});
`;
}

function generateEdgeFunctionTest(functionPath, functionName) {
  return `/**
 * Tests for ${functionName} edge function
 * Auto-generated test template - fill in with actual test cases
 */

import { describe, it, expect } from 'vitest';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

describe('${functionName} Edge Function', () => {
  it('should handle valid requests', async () => {
    // TODO: Test successful request
    expect(true).toBe(true); // Replace with actual test
  });

  it('should validate required parameters', async () => {
    // TODO: Test parameter validation
    // const response = await fetch(\`\${SUPABASE_URL}/functions/v1/${functionName}\`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({})
    // });
    // expect(response.status).toBe(400);

    expect(true).toBe(true); // Replace with actual test
  });

  it('should handle errors gracefully', async () => {
    // TODO: Test error handling
    expect(true).toBe(true); // Replace with actual test
  });

  it('should enforce security policies', async () => {
    // TODO: Test authentication/authorization
    expect(true).toBe(true); // Replace with actual test
  });
});
`;
}

function generateUtilityTest(utilPath, utilName) {
  return `/**
 * Tests for ${utilName}
 * Auto-generated test template - fill in with actual test cases
 */

import { describe, it, expect } from 'vitest';
import { ${utilName} } from '../${utilName}';

describe('${utilName}', () => {
  it('should handle valid input', () => {
    // TODO: Test with valid inputs
    expect(true).toBe(true); // Replace with actual test
  });

  it('should handle invalid input', () => {
    // TODO: Test with invalid inputs
    expect(true).toBe(true); // Replace with actual test
  });

  it('should handle edge cases', () => {
    // TODO: Test edge cases
    expect(true).toBe(true); // Replace with actual test
  });
});
`;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Error: Please provide a file path');
    console.log('Usage: node scripts/generate-test.js <file-path>');
    console.log('Example: node scripts/generate-test.js src/components/MyComponent.tsx');
    process.exit(1);
  }

  const filePath = args[0];
  const fullPath = path.resolve(rootDir, filePath);

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const fileName = path.basename(filePath, path.extname(filePath));
  const fileDir = path.dirname(fullPath);

  // Determine test location based on file type
  let testDir, testContent;

  if (filePath.includes('src/components/')) {
    // Component test
    testDir = path.join(fileDir, '__tests__');
    testContent = generateComponentTest(filePath, fileName);
  } else if (filePath.includes('supabase/functions/')) {
    // Edge function test
    testDir = path.join(rootDir, 'tests');
    testContent = generateEdgeFunctionTest(filePath, fileName);
  } else {
    // Utility/other test
    testDir = path.join(fileDir, '__tests__');
    testContent = generateUtilityTest(filePath, fileName);
  }

  // Create test directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testFileName = `${fileName}.test.${filePath.endsWith('.tsx') ? 'tsx' : 'ts'}`;
  const testFilePath = path.join(testDir, testFileName);

  // Check if test already exists
  if (fs.existsSync(testFilePath)) {
    console.log(`⚠️  Test already exists: ${path.relative(rootDir, testFilePath)}`);
    console.log('Skipping generation to avoid overwriting existing tests.');
    process.exit(0);
  }

  // Write test file
  fs.writeFileSync(testFilePath, testContent);

  console.log(`✅ Test file created: ${path.relative(rootDir, testFilePath)}`);
  console.log('\n📝 Next steps:');
  console.log('1. Open the test file and replace placeholder tests with actual test cases');
  console.log('2. Run tests: bun test');
  console.log('3. Commit the test file along with your code changes');
}

main();
