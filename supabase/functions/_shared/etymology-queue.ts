// Go-live date for the deterministic queue rotation. Fixed once at rollout -
// do not change after go-live, or "today's" saying will jump.
export const ETYMOLOGY_EPOCH_DATE = '2026-09-08';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcMidnight(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// 1-based: the epoch date itself is day_index 1, matching etymology_queue's
// sequence_number starting at 1.
export function getDayIndex(now: Date, epoch: string = ETYMOLOGY_EPOCH_DATE): number {
  const epochMs = toUtcMidnight(new Date(epoch));
  const nowMs = toUtcMidnight(now);
  return Math.floor((nowMs - epochMs) / MS_PER_DAY) + 1;
}

// How many pre-generated days remain ahead of today.
export function getRunway(maxSequenceNumber: number, dayIndex: number): number {
  return maxSequenceNumber - dayIndex;
}
