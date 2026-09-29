// Postgres error codes seen when another build applies the same migration at the same moment.
const CONCURRENT_CODES = new Set(['23505', '42P07', '42710']);

export function isConcurrentMigrationError(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' && CONCURRENT_CODES.has(code);
}

/**
 * Run `fn`, retrying when a parallel build won the race to create the same objects.
 * The migration runs in one transaction, so the losing attempt rolls back; the retry
 * then finds the winner's migrations recorded and skips them.
 */
export async function withMigrationRetry<T>(
  fn: () => Promise<T>,
  { attempts = 5, delayMs = 5000 }: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts || !isConcurrentMigrationError(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
