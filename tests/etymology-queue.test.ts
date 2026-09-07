import { describe, it, expect } from 'vitest';
import { getDayIndex, getRunway } from '../supabase/functions/_shared/etymology-queue';

describe('getDayIndex', () => {
  it('returns 1 on the epoch date itself', () => {
    expect(getDayIndex(new Date('2026-09-15T00:00:00Z'), '2026-09-15')).toBe(1);
  });

  it('returns 1 for any time on the epoch date, regardless of time of day', () => {
    expect(getDayIndex(new Date('2026-09-15T23:59:59Z'), '2026-09-15')).toBe(1);
  });

  it('increments by 1 for each calendar day after the epoch', () => {
    expect(getDayIndex(new Date('2026-09-16T00:00:00Z'), '2026-09-15')).toBe(2);
    expect(getDayIndex(new Date('2026-09-22T00:00:00Z'), '2026-09-15')).toBe(8);
  });

  it('is stable across multiple calls on the same UTC date (idempotent)', () => {
    const a = getDayIndex(new Date('2026-09-20T06:05:00Z'), '2026-09-15');
    const b = getDayIndex(new Date('2026-09-20T23:00:00Z'), '2026-09-15');
    expect(a).toBe(b);
  });

  it('returns values before 1 for dates prior to the epoch', () => {
    expect(getDayIndex(new Date('2026-09-14T00:00:00Z'), '2026-09-15')).toBe(0);
  });
});

describe('getRunway', () => {
  it('returns the number of pre-generated days remaining ahead of today', () => {
    expect(getRunway(21, 1)).toBe(20);
    expect(getRunway(21, 21)).toBe(0);
  });

  it('returns a negative number when the queue has fallen behind today', () => {
    expect(getRunway(5, 10)).toBe(-5);
  });
});
