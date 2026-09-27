'use server';

import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';
import { MAX_CART_LINES, cartLineSchema } from '@/lib/cart-schema';
import { quoteCart, type CartQuote } from '@/server/catalog';
import { hashIp } from '@/server/crypto';
import { getDb } from '@/server/db/client';
import { computeTotals, evaluateDiscount, type DiscountReason } from '@/server/discounts';
import { invalidate, TAGS } from '@/server/next/cache';
import { setOrderCookie } from '@/server/next/order-cookie';
import { requestIp, requestSessionId } from '@/server/next/request';
import { trackOrder, type TrackView } from '@/server/orders/manage';
import { placeOrder, type PlaceOrderResult } from '@/server/orders/place-order';
import { newOrderPayload, notifyAdmins } from '@/server/push';
import { hitLimit } from '@/server/rate-limit';
import { listVisibleReviews, type ReviewView } from '@/server/reviews';
import { getSettings } from '@/server/settings';
import { verifyTurnstile } from '@/server/turnstile';

const loadMoreSchema = z.object({ productId: z.uuid(), offset: z.int().min(0).max(1000) });

export async function loadMoreReviewsAction(productId: string, offset: number): Promise<ReviewView[]> {
  const parsed = loadMoreSchema.safeParse({ productId, offset });
  if (!parsed.success) return [];
  return listVisibleReviews(getDb(), parsed.data.productId, { limit: 6, offset: parsed.data.offset });
}

export type CartQuoteResult = CartQuote & { deliveryCents: number; totalCents: number };

const EMPTY: CartQuoteResult = { lines: [], removed: [], subtotalCents: 0, deliveryCents: 0, totalCents: 0 };
const linesSchema = z.array(cartLineSchema).max(MAX_CART_LINES);

/** Current prices for the browser's cart; unknown or unavailable lines come back in `removed`. */
export async function quoteCartAction(lines: unknown): Promise<CartQuoteResult> {
  const parsed = linesSchema.safeParse(lines);
  if (!parsed.success || parsed.data.length === 0) return EMPTY;
  const db = getDb();
  const [quote, settings] = await Promise.all([quoteCart(db, parsed.data), getSettings(db)]);
  if (quote.lines.length === 0) return { ...EMPTY, removed: quote.removed };
  const totals = computeTotals({ subtotalCents: quote.subtotalCents, discountCents: 0, settings });
  return { ...quote, deliveryCents: totals.deliveryCents, totalCents: totals.totalCents };
}

export type DiscountPreview =
  | { ok: true; code: string; subtotalCents: number; discountCents: number; deliveryCents: number; totalCents: number }
  | { ok: false; reason: DiscountReason | 'rate_limited' };

/** Preview a discount code on the current cart (the order re-checks it on submit). */
export async function applyDiscountAction(a: { code: string; lines: unknown }): Promise<DiscountPreview> {
  const code = z.string().trim().min(1).max(32).safeParse(a.code);
  const lines = linesSchema.min(1).safeParse(a.lines);
  if (!code.success || !lines.success) return { ok: false, reason: 'not_found' };
  const db = getDb();
  const limit = await hitLimit(db, `discount:ip:${hashIp(await requestIp())}`, 20, 600);
  if (!limit.allowed) return { ok: false, reason: 'rate_limited' };

  const [quote, settings] = await Promise.all([quoteCart(db, lines.data), getSettings(db)]);
  const d = await evaluateDiscount(db, { code: code.data, subtotalCents: quote.subtotalCents, phone: null, now: new Date() });
  if (!d.ok) return d;
  const totals = computeTotals({ subtotalCents: quote.subtotalCents, discountCents: d.amountCents, settings });
  return { ok: true, code: d.code, ...totals };
}

export type PlaceOrderFailure = Extract<PlaceOrderResult, { ok: false }>;

/** Place the order; on success sets the confirmation cookie and redirects to the thank-you page. */
export async function placeOrderAction(input: unknown): Promise<PlaceOrderFailure> {
  const db = getDb();
  const [ip, sessionId] = await Promise.all([requestIp(), requestSessionId()]);
  const result = await placeOrder(db, input, {
    ip,
    sessionId,
    now: new Date(),
    verifyTurnstile,
    // Push to admin phones after the customer's response is sent.
    notify: async (notice) => {
      after(async () => {
        await notifyAdmins(db, newOrderPayload(notice)).catch((err) => console.error('push failed', err));
      });
    },
  });
  if (!result.ok) return result;

  if (result.stockCrossedZero) invalidate(TAGS.catalog);
  await setOrderCookie(result.orderId);
  const locale = (input as { locale?: unknown } | null)?.locale === 'ar' ? 'ar' : 'en';
  redirect(`/${locale}/order/${result.orderNumber}`);
}

export type TrackResult = { ok: true; order: TrackView } | { ok: false; error: 'not_found' | 'captcha' | 'rate_limited' };

export async function trackOrderAction(a: { number: string; phone: string; turnstileToken: string }): Promise<TrackResult> {
  const db = getDb();
  const ip = await requestIp();
  if (!(await verifyTurnstile(String(a.turnstileToken ?? ''), ip))) return { ok: false, error: 'captcha' };
  const limit = await hitLimit(db, `track:ip:${hashIp(ip)}`, 10, 600);
  if (!limit.allowed) return { ok: false, error: 'rate_limited' };
  const number = Number(String(a.number ?? '').replace(/[^\d]/g, ''));
  const order = await trackOrder(db, { number, phone: String(a.phone ?? '').slice(0, 40) });
  return order ? { ok: true, order } : { ok: false, error: 'not_found' };
}
