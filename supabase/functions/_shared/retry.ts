// Retries a Supabase query a few times on transient failure (e.g. a gateway
// timeout hitting a cold connection pool right after the function boots -
// seen twice now, both times on the very first query of the day, both times
// resolved instantly on manual retry). Not for genuine, persistent errors -
// just enough attempts to ride out a brief blip.
export async function withRetry<T>(
  query: () => PromiseLike<{ data: T | null; error: unknown }>,
  { attempts = 3, delayMs = 2000 }: { attempts?: number; delayMs?: number } = {}
): Promise<{ data: T | null; error: unknown }> {
  let lastResult: { data: T | null; error: unknown } = { data: null, error: null };

  for (let i = 0; i < attempts; i++) {
    lastResult = await query();

    if (!lastResult.error) {
      return lastResult;
    }

    if (i < attempts - 1) {
      console.log(`Query attempt ${i + 1}/${attempts} failed, retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return lastResult;
}
