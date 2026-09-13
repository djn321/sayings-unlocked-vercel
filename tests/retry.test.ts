import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../supabase/functions/_shared/retry';

describe('withRetry', () => {
  it('returns the result immediately on first success', async () => {
    const query = vi.fn().mockResolvedValue({ data: 'ok', error: null });
    const result = await withRetry(query, { attempts: 3, delayMs: 0 });
    expect(result).toEqual({ data: 'ok', error: null });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('retries on error and returns the eventual success', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'Gateway Timeout' } })
      .mockResolvedValueOnce({ data: 'ok', error: null });

    const result = await withRetry(query, { attempts: 3, delayMs: 0 });
    expect(result).toEqual({ data: 'ok', error: null });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('gives up after the configured number of attempts and returns the last error', async () => {
    const query = vi.fn().mockResolvedValue({ data: null, error: { message: 'Gateway Timeout' } });
    const result = await withRetry(query, { attempts: 3, delayMs: 0 });
    expect(result.error).toEqual({ message: 'Gateway Timeout' });
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('does not retry beyond the default of 3 attempts', async () => {
    const query = vi.fn().mockResolvedValue({ data: null, error: { message: 'still failing' } });
    await withRetry(query, { delayMs: 0 });
    expect(query).toHaveBeenCalledTimes(3);
  });
});
