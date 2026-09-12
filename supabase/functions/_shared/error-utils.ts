// Supabase query errors (PostgrestError etc.) are plain objects with a
// `message` field, not Error instances - String(error) on one of those
// produces the useless "[object Object]", which is what actually showed up
// in an admin alert. This handles both real Error instances and
// object-shaped errors, falling back to JSON for anything else.
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    const err = error as { message: string; code?: string; details?: string; hint?: string };
    const parts = [err.message, err.code && `code: ${err.code}`, err.details, err.hint].filter(Boolean);
    return parts.join(' - ');
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
