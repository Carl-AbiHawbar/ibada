import { and, eq, sql } from 'drizzle-orm';
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

export function computeTotals(a: { subtotalCents: number; discountCents: number; settings: StoreSettings }): OrderTotals {
  const afterDiscount = a.subtotalCents - a.discountCents;
  const deliveryCents = deliveryFeeFor(a.settings, afterDiscount);
  return {
    subtotalCents: a.subtotalCents,
    discountCents: a.discountCents,
    deliveryCents,
    totalCents: afterDiscount + deliveryCents,
  };
}
