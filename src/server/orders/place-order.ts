import { and, eq, gte, isNull, lt, or, sql } from 'drizzle-orm';
import type { L10n } from '@/lib/cart-schema';
import { districtName, type DistrictId } from '@/lib/lebanon';
import { recordEvent } from '../analytics';
import { quoteCart } from '../catalog';
import { hashIp } from '../crypto';
import { upsertCustomerForOrder } from '../customers';
import type { Db } from '../db/client';
import {
  customers,
  discountRedemptions,
  discounts,
  inventoryMovements,
  orderEvents,
  orderItems,
  orders,
  products,
} from '../db/schema';
import { computeTotals, evaluateDiscount, type DiscountReason } from '../discounts';
import { hitLimit } from '../rate-limit';
import { getSettings } from '../settings';
import type { TurnstileVerifier } from '../turnstile';
import { fieldErrorsOf, placeOrderSchema } from './schema';

export type NewOrderNotice = {
  id: string;
  number: number;
  items: { bundleName: string; quantity: number }[];
  totalCents: number;
  district: string;
};

export type PlaceOrderContext = {
  ip: string | null;
  sessionId: string | null;
  now: Date;
  verifyTurnstile: TurnstileVerifier;
  notify: (n: NewOrderNotice) => Promise<void>;
};

export type PlaceOrderError =
  | 'invalid'
  | 'captcha'
  | 'rate_limited'
  | 'blocked'
  | 'cart_changed'
  | 'out_of_stock'
  | 'discount_invalid';

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: number; duplicate: boolean; stockCrossedZero: boolean }
  | {
      ok: false;
      error: PlaceOrderError;
      fieldErrors?: Record<string, string>;
      productName?: L10n;
      discountReason?: DiscountReason;
    };

const ORDER_LIMIT_PER_IP = { limit: 5, windowSeconds: 3600 };
const ORDER_LIMIT_PER_PHONE = { limit: 3, windowSeconds: 86_400 };

// Thrown inside the transaction to roll it back; mapped to a result outside.
class Abort extends Error {
  constructor(readonly result: Extract<PlaceOrderResult, { ok: false }> | { duplicateOf: string }) {
    super('abort');
  }
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
}

async function findByKey(db: Db, key: string) {
  const [row] = await db
    .select({ id: orders.id, number: orders.number })
    .from(orders)
    .where(eq(orders.idempotencyKey, key))
    .limit(1);
  return row ?? null;
}

/** Validate, price and save a cash-on-delivery order. See spec §6 for the exact steps. */
export async function placeOrder(db: Db, input: unknown, ctx: PlaceOrderContext): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid', fieldErrors: fieldErrorsOf(parsed.error) };
  const data = parsed.data;

  const existing = await findByKey(db, data.idempotencyKey);
  if (existing) {
    return { ok: true, orderId: existing.id, orderNumber: existing.number, duplicate: true, stockCrossedZero: false };
  }

  if (!(await ctx.verifyTurnstile(data.turnstileToken, ctx.ip))) return { ok: false, error: 'captcha' };

  const ipHash = hashIp(ctx.ip);
  const byIp = await hitLimit(db, `order:ip:${ipHash}`, ORDER_LIMIT_PER_IP.limit, ORDER_LIMIT_PER_IP.windowSeconds, ctx.now);
  const byPhone = await hitLimit(
    db,
    `order:phone:${data.phone}`,
    ORDER_LIMIT_PER_PHONE.limit,
    ORDER_LIMIT_PER_PHONE.windowSeconds,
    ctx.now,
  );
  if (!byIp.allowed || !byPhone.allowed) return { ok: false, error: 'rate_limited' };

  const [known] = await db
    .select({ blocked: customers.blocked })
    .from(customers)
    .where(eq(customers.phone, data.phone))
    .limit(1);
  if (known?.blocked) return { ok: false, error: 'blocked' };

  let saved: { orderId: string; orderNumber: number; stockCrossedZero: boolean; notice: NewOrderNotice };
  try {
    saved = await db.transaction(async (tx) => {
      const quote = await quoteCart(tx, data.cart, { checkStock: false });
      if (quote.removed.length > 0 || quote.lines.length === 0) throw new Abort({ ok: false, error: 'cart_changed' });

      const storeSettings = await getSettings(tx);
      let discount: Awaited<ReturnType<typeof evaluateDiscount>> | null = null;
      if (data.discountCode) {
        discount = await evaluateDiscount(tx, {
          code: data.discountCode,
          subtotalCents: quote.subtotalCents,
          phone: data.phone,
          now: ctx.now,
        });
        if (!discount.ok) throw new Abort({ ok: false, error: 'discount_invalid', discountReason: discount.reason });
      }
      const totals = computeTotals({
        subtotalCents: quote.subtotalCents,
        discountCents: discount?.ok ? discount.amountCents : 0,
        settings: storeSettings,
      });

      // Take stock atomically: the WHERE clause refuses to go below zero.
      const unitsByProduct = new Map<string, { units: number; name: L10n }>();
      for (const l of quote.lines) {
        const cur = unitsByProduct.get(l.productId);
        unitsByProduct.set(l.productId, { units: (cur?.units ?? 0) + l.units * l.quantity, name: l.productName });
      }
      let stockCrossedZero = false;
      for (const [productId, { units, name }] of unitsByProduct) {
        const [row] = await tx
          .update(products)
          .set({ stockUnits: sql`${products.stockUnits} - ${units}` })
          .where(and(eq(products.id, productId), gte(products.stockUnits, units)))
          .returning({ stockUnits: products.stockUnits });
        if (!row) throw new Abort({ ok: false, error: 'out_of_stock', productName: name });
        if (row.stockUnits === 0) stockCrossedZero = true;
      }

      const customer = await upsertCustomerForOrder(tx, { phone: data.phone, name: data.name, now: ctx.now });

      const [order] = await tx
        .insert(orders)
        .values({
          idempotencyKey: data.idempotencyKey,
          customerId: customer.id,
          locale: data.locale,
          name: data.name,
          phone: data.phone,
          governorate: data.governorate,
          district: data.district,
          town: data.town,
          addressLine: data.addressLine,
          landmark: data.landmark,
          notes: data.notes,
          ...totals,
          discountCode: discount?.ok ? discount.code : null,
          ipHash,
          createdAt: ctx.now,
        })
        .onConflictDoNothing({ target: orders.idempotencyKey })
        .returning({ id: orders.id, number: orders.number });
      if (!order) throw new Abort({ duplicateOf: data.idempotencyKey });

      await tx.insert(orderItems).values(
        quote.lines.map((l) => ({
          orderId: order.id,
          productId: l.productId,
          bundleId: l.bundleId,
          productNameEn: l.productName.en,
          productNameAr: l.productName.ar,
          bundleNameEn: l.bundleName.en,
          bundleNameAr: l.bundleName.ar,
          unitsPerBundle: l.units,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
          lineTotalCents: l.lineTotalCents,
        })),
      );
      await tx.insert(orderEvents).values({ orderId: order.id, type: 'created', toStatus: 'new', createdAt: ctx.now });
      await tx.insert(inventoryMovements).values(
        [...unitsByProduct].map(([productId, { units }]) => ({
          productId,
          deltaUnits: -units,
          reason: 'order' as const,
          orderId: order.id,
          createdAt: ctx.now,
        })),
      );

      if (discount?.ok) {
        // Conditional increment closes the race on a code's last remaining use.
        const [claimed] = await tx
          .update(discounts)
          .set({ usedCount: sql`${discounts.usedCount} + 1` })
          .where(
            and(
              eq(discounts.id, discount.discountId),
              or(isNull(discounts.usageLimit), lt(discounts.usedCount, discounts.usageLimit)),
            ),
          )
          .returning({ id: discounts.id });
        if (!claimed) throw new Abort({ ok: false, error: 'discount_invalid', discountReason: 'usage_limit' });
        try {
          await tx.insert(discountRedemptions).values({
            discountId: discount.discountId,
            orderId: order.id,
            phone: data.phone,
            oncePerPhone: discount.oncePerPhone,
          });
        } catch (err) {
          if (isUniqueViolation(err)) {
            throw new Abort({ ok: false, error: 'discount_invalid', discountReason: 'already_used' });
          }
          throw err;
        }
      }

      return {
        orderId: order.id,
        orderNumber: order.number,
        stockCrossedZero,
        notice: {
          id: order.id,
          number: order.number,
          items: quote.lines.map((l) => ({ bundleName: l.bundleName.en, quantity: l.quantity })),
          totalCents: totals.totalCents,
          district: districtName(data.district as DistrictId, 'en'),
        },
      };
    });
  } catch (err) {
    if (err instanceof Abort) {
      if ('duplicateOf' in err.result) {
        const dup = await findByKey(db, err.result.duplicateOf);
        if (dup) return { ok: true, orderId: dup.id, orderNumber: dup.number, duplicate: true, stockCrossedZero: false };
        throw new Error('duplicate order vanished');
      }
      return err.result;
    }
    throw err;
  }

  if (ctx.sessionId) {
    await recordEvent(db, { type: 'order_placed', sessionId: ctx.sessionId, locale: data.locale, now: ctx.now }).catch(
      () => {},
    );
  }
  try {
    await ctx.notify(saved.notice);
  } catch (err) {
    console.error('New-order notification failed', err);
  }

  return {
    ok: true,
    orderId: saved.orderId,
    orderNumber: saved.orderNumber,
    duplicate: false,
    stockCrossedZero: saved.stockCrossedZero,
  };
}
