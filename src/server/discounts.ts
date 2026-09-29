import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from './db/client';
import { discountRedemptions, discounts } from './db/schema';
import { deliveryFeeFor, type StoreSettings } from './settings';

export type DiscountReason =
  | 'not_found'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'min_subtotal'
  | 'usage_limit'
  | 'already_used';

export type DiscountResult =
  | { ok: true; discountId: string; code: string; amountCents: number; oncePerPhone: boolean }
  | { ok: false; reason: DiscountReason };

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Check a code against a subtotal (and phone, once known) and compute its amount. */
export async function evaluateDiscount(
  db: Db,
  a: { code: string; subtotalCents: number; phone: string | null; now: Date },
): Promise<DiscountResult> {
  const code = normalizeCode(a.code);
  if (!code) return { ok: false, reason: 'not_found' };

  const [d] = await db
    .select()
    .from(discounts)
    .where(sql`upper(${discounts.code}) = ${code}`)
    .limit(1);
  if (!d) return { ok: false, reason: 'not_found' };
  if (!d.active) return { ok: false, reason: 'inactive' };
  if (d.startsAt && a.now < d.startsAt) return { ok: false, reason: 'not_started' };
  if (d.endsAt && a.now >= d.endsAt) return { ok: false, reason: 'expired' };
  if (d.minSubtotalCents !== null && a.subtotalCents < d.minSubtotalCents) return { ok: false, reason: 'min_subtotal' };
  if (d.usageLimit !== null && d.usedCount >= d.usageLimit) return { ok: false, reason: 'usage_limit' };

  if (d.oncePerPhone && a.phone) {
    const [used] = await db
      .select({ id: discountRedemptions.id })
      .from(discountRedemptions)
      .where(and(eq(discountRedemptions.discountId, d.id), eq(discountRedemptions.phone, a.phone)))
      .limit(1);
    if (used) return { ok: false, reason: 'already_used' };
  }

  const amountCents =
    d.type === 'percent' ? Math.round((a.subtotalCents * d.value) / 100) : Math.min(d.value, a.subtotalCents);
  return { ok: true, discountId: d.id, code: d.code.toUpperCase(), amountCents, oncePerPhone: d.oncePerPhone };
}

export type OrderTotals = { subtotalCents: number; discountCents: number; deliveryCents: number; totalCents: number };

/** `freeDelivery`: the shopper claimed the free-delivery offer (signed cookie). */
export function computeTotals(a: {
  subtotalCents: number;
  discountCents: number;
  settings: StoreSettings;
  freeDelivery?: boolean;
}): OrderTotals {
  const afterDiscount = a.subtotalCents - a.discountCents;
  const deliveryCents = a.freeDelivery ? 0 : deliveryFeeFor(a.settings, afterDiscount);
  return {
    subtotalCents: a.subtotalCents,
    discountCents: a.discountCents,
    deliveryCents,
    totalCents: afterDiscount + deliveryCents,
  };
}

// ---------- admin ----------

export const discountInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{3,32}$/, 'Use 3–32 letters, numbers, - or _')
      .transform(normalizeCode),
    type: z.enum(['percent', 'fixed']),
    value: z.int().min(1, 'Must be at least 1').max(1_000_000),
    minSubtotalCents: z.int().min(0).max(10_000_000).nullable(),
    usageLimit: z.int().min(1).max(1_000_000).nullable(),
    oncePerPhone: z.boolean(),
    startsAt: z.date().nullable(),
    endsAt: z.date().nullable(),
    active: z.boolean(),
  })
  .refine((d) => d.type !== 'percent' || d.value <= 100, { path: ['value'], message: 'A percentage must be 100 or less' })
  .refine((d) => !d.startsAt || !d.endsAt || d.endsAt > d.startsAt, { path: ['endsAt'], message: 'End must be after start' });

export type DiscountInput = z.infer<typeof discountInputSchema>;

export async function saveDiscount(
  db: Db,
  a: { id?: string; input: unknown },
): Promise<{ ok: true; id: string } | { ok: false; error: 'invalid' | 'code_taken' | 'not_found'; fieldErrors?: Record<string, string> }> {
  const parsed = discountInputSchema.safeParse(a.input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'invalid',
      fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), i.message])),
    };
  }
  try {
    if (a.id) {
      const [row] = await db.update(discounts).set(parsed.data).where(eq(discounts.id, a.id)).returning({ id: discounts.id });
      return row ? { ok: true, id: row.id } : { ok: false, error: 'not_found' };
    }
    const [row] = await db.insert(discounts).values(parsed.data).returning({ id: discounts.id });
    return { ok: true, id: row!.id };
  } catch (err) {
    const e = err as { code?: string; cause?: { code?: string } };
    if (e?.code === '23505' || e?.cause?.code === '23505') {
      return { ok: false, error: 'code_taken', fieldErrors: { code: 'This code already exists' } };
    }
    throw err;
  }
}

export async function listDiscounts(db: Db) {
  return db.select().from(discounts).orderBy(desc(discounts.createdAt));
}

export async function getDiscount(db: Db, id: string) {
  const [row] = await db.select().from(discounts).where(eq(discounts.id, id));
  return row ?? null;
}

export async function setDiscountActive(db: Db, id: string, active: boolean): Promise<void> {
  await db.update(discounts).set({ active }).where(eq(discounts.id, id));
}
