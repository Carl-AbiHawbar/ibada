import { and, eq, sql } from 'drizzle-orm';
import { getEnv } from '@/env';
import type { Db } from './db/client';
import { rateLimits } from './db/schema';

function windowStart(now: Date, windowSeconds: number): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

const effectiveLimit = (limit: number) => limit * getEnv().RATE_LIMIT_MULTIPLIER;

/** Count one attempt for `key` in the current fixed window; allowed while count ≤ limit. */
export async function hitLimit(
  db: Db,
  key: string,
  limit: number,
  windowSeconds: number,
  now: Date = new Date(),
): Promise<{ allowed: boolean; count: number }> {
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: windowStart(now, windowSeconds), count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });
  const count = row?.count ?? Number.MAX_SAFE_INTEGER;
  return { allowed: count <= effectiveLimit(limit), count };
}

/** Whether another attempt would still be allowed, without counting one. */
export async function peekLimit(
  db: Db,
  key: string,
  limit: number,
  windowSeconds: number,
  now: Date = new Date(),
): Promise<boolean> {
  const [row] = await db
    .select({ count: rateLimits.count })
    .from(rateLimits)
    .where(and(eq(rateLimits.key, key), eq(rateLimits.windowStart, windowStart(now, windowSeconds))));
  return (row?.count ?? 0) < effectiveLimit(limit);
}
