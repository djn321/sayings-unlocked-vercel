import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../supabase/functions/_shared/error-utils';

describe('getErrorMessage', () => {
  it('returns the message from a real Error instance', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('extracts message, code, details, and hint from a Supabase-style error object', () => {
    const supabaseError = {
      message: 'relation "etymology_queue" does not exist',
      code: '42P01',
      details: null,
      hint: null,
    };
    expect(getErrorMessage(supabaseError)).toBe('relation "etymology_queue" does not exist - code: 42P01');
  });

  it('includes details and hint when present', () => {
    const supabaseError = {
      message: 'permission denied',
      code: '42501',
      details: 'RLS policy violation',
      hint: 'check your policies',
    };
    expect(getErrorMessage(supabaseError)).toBe(
      'permission denied - code: 42501 - RLS policy violation - check your policies'
    );
  });

  it('falls back to JSON.stringify for plain objects without a message', () => {
    expect(getErrorMessage({ foo: 'bar' })).toBe('{"foo":"bar"}');
  });

  it('falls back to String() for primitives', () => {
    expect(getErrorMessage('just a string')).toBe('"just a string"');
    expect(getErrorMessage(42)).toBe('42');
    expect(getErrorMessage(null)).toBe('null');
  });
});
