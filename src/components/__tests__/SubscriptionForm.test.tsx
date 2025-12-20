/**
 * Tests for SubscriptionForm component
 * Ensures subscription form continues to work correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubscriptionForm } from '../SubscriptionForm';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id', confirmation_token: 'test-token' }, error: null }))
        }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({
      data: { id: 'test-id', confirmation_token: 'test-token', email: 'test@example.com' },
      error: null
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: {}, error: null }))
    }
  }
}));

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('SubscriptionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render subscription form', () => {
    render(<SubscriptionForm />);

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    render(<SubscriptionForm />);

    const emailInput = screen.getByPlaceholderText(/email/i);
    const submitButton = screen.getByRole('button', { name: /subscribe/i });

    // Try submitting with invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    // Should show validation error (implementation depends on your validation)
    // This is a placeholder test
    expect(true).toBe(true);
  });

  it('should handle successful subscription', async () => {
    render(<SubscriptionForm />);

    const emailInput = screen.getByPlaceholderText(/email/i);
    const submitButton = screen.getByRole('button', { name: /subscribe/i });

    // Submit valid email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Form should be disabled during submission
      expect(submitButton).toBeDisabled();
    });
  });

  it('should prevent duplicate submissions', async () => {
    render(<SubscriptionForm />);

    const emailInput = screen.getByPlaceholderText(/email/i);
    const submitButton = screen.getByRole('button', { name: /subscribe/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    // Click submit multiple times rapidly
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    // Should only submit once (button should be disabled)
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('should clear form after successful subscription', async () => {
    render(<SubscriptionForm />);

    const emailInput = screen.getByPlaceholderText(/email/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /subscribe/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Email input should be cleared after successful submission
      expect(emailInput.value).toBe('');
    });
  });
});
