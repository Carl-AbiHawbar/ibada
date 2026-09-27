'use server';

import { z } from 'zod';
import { MAX_CART_LINES, cartLineSchema } from '@/lib/cart-schema';
import { quoteCart, type CartQuote } from '@/server/catalog';
import { getDb } from '@/server/db/client';
import { computeTotals } from '@/server/discounts';
import { listVisibleReviews, type ReviewView } from '@/server/reviews';
import { getSettings } from '@/server/settings';

const loadMoreSchema = z.object({ productId: z.uuid(), offset: z.int().min(0).max(1000) });

export async function loadMoreReviewsAction(productId: string, offset: number): Promise<ReviewView[]> {
  const parsed = loadMoreSchema.safeParse({ productId, offset });
  if (!parsed.success) return [];
  return listVisibleReviews(getDb(), parsed.data.productId, { limit: 6, offset: parsed.data.offset });
}

export type CartQuoteResult = CartQuote & { deliveryCents: number; totalCents: number };

const EMPTY: CartQuoteResult = { lines: [], removed: [], subtotalCents: 0, deliveryCents: 0, totalCents: 0 };

/** Current prices for the browser's cart; unknown or unavailable lines come back in `removed`. */
export async function quoteCartAction(lines: unknown): Promise<CartQuoteResult> {
  const parsed = z.array(cartLineSchema).max(MAX_CART_LINES).safeParse(lines);
  if (!parsed.success || parsed.data.length === 0) return EMPTY;
  const db = getDb();
  const [quote, settings] = await Promise.all([quoteCart(db, parsed.data), getSettings(db)]);
  if (quote.lines.length === 0) return { ...EMPTY, removed: quote.removed };
  const totals = computeTotals({ subtotalCents: quote.subtotalCents, discountCents: 0, settings });
  return { ...quote, deliveryCents: totals.deliveryCents, totalCents: totals.totalCents };
}
