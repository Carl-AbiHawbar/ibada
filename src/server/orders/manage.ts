import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { L10n } from '@/lib/cart-schema';
import { canTransition, type OrderStatus } from '@/lib/order-status';
import { normalizeLebanesePhone } from '@/lib/phone';
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

export type ChangeStatusResult =
  | { ok: true; stockCrossedZero: boolean }
  | { ok: false; error: 'not_found' | 'invalid_transition' | 'conflict' };

class Conflict extends Error {}

type Tx = Db;

/** Put an order's units back on the shelf; true when a product went from 0 to > 0. */
async function restock(tx: Tx, orderId: string, reason: 'cancel' | 'return', userId: string | null, now: Date) {
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const byProduct = new Map<string, number>();
  for (const it of items) {
    if (!it.productId) continue;
    byProduct.set(it.productId, (byProduct.get(it.productId) ?? 0) + it.unitsPerBundle * it.quantity);
  }
  let crossedZero = false;
  for (const [productId, units] of byProduct) {
    const [row] = await tx
      .update(products)
      .set({ stockUnits: sql`${products.stockUnits} + ${units}` })
      .where(eq(products.id, productId))
      .returning({ stockUnits: products.stockUnits });
    if (row && row.stockUnits - units === 0) crossedZero = true;
    await tx.insert(inventoryMovements).values({ productId, deltaUnits: units, reason, orderId, userId, createdAt: now });
  }
  return crossedZero;
}

async function releaseDiscount(tx: Tx, orderId: string) {
  const reds = await tx.select().from(discountRedemptions).where(eq(discountRedemptions.orderId, orderId));
  for (const r of reds) {
    await tx
      .update(discounts)
      .set({ usedCount: sql`GREATEST(${discounts.usedCount} - 1, 0)` })
      .where(eq(discounts.id, r.discountId));
  }
  if (reds.length) await tx.delete(discountRedemptions).where(eq(discountRedemptions.orderId, orderId));
}

/** Move an order along the status machine, applying stock, discount and customer side effects. */
export async function changeOrderStatus(
  db: Db,
  a: { orderId: string; to: OrderStatus; userId: string | null; note?: string; now: Date },
): Promise<ChangeStatusResult> {
  const [current] = await db
    .select({ status: orders.status, customerId: orders.customerId, totalCents: orders.totalCents })
    .from(orders)
    .where(eq(orders.id, a.orderId))
    .limit(1);
  if (!current) return { ok: false, error: 'not_found' };
  if (!canTransition(current.status, a.to)) return { ok: false, error: 'invalid_transition' };

  try {
    return await db.transaction(async (tx) => {
      // Only the admin who still sees the old status wins; a concurrent change makes this a no-op.
      const [updated] = await tx
        .update(orders)
        .set({ status: a.to, ...(a.to === 'delivered' ? { paymentStatus: 'paid' as const } : {}), updatedAt: a.now })
        .where(and(eq(orders.id, a.orderId), eq(orders.status, current.status)))
        .returning({ id: orders.id });
      if (!updated) throw new Conflict();

      await tx.insert(orderEvents).values({
        orderId: a.orderId,
        type: 'status_changed',
        fromStatus: current.status,
        toStatus: a.to,
        note: a.note?.trim() || null,
        userId: a.userId,
        createdAt: a.now,
      });

      let stockCrossedZero = false;
      if (a.to === 'cancelled') {
        stockCrossedZero = await restock(tx, a.orderId, 'cancel', a.userId, a.now);
        await releaseDiscount(tx, a.orderId);
        await tx
          .update(customers)
          .set({ orderCount: sql`GREATEST(${customers.orderCount} - 1, 0)` })
          .where(eq(customers.id, current.customerId));
      } else if (a.to === 'delivered') {
        await tx
          .update(customers)
          .set({ totalSpentCents: sql`${customers.totalSpentCents} + ${current.totalCents}` })
          .where(eq(customers.id, current.customerId));
      } else if (a.to === 'returned') {
        stockCrossedZero = await restock(tx, a.orderId, 'return', a.userId, a.now);
        await tx
          .update(customers)
          .set({ totalSpentCents: sql`GREATEST(${customers.totalSpentCents} - ${current.totalCents}, 0)` })
          .where(eq(customers.id, current.customerId));
      }
      return { ok: true as const, stockCrossedZero };
    });
  } catch (err) {
    if (err instanceof Conflict) return { ok: false, error: 'conflict' };
    throw err;
  }
}

export async function bulkChangeStatus(
  db: Db,
  a: { orderIds: string[]; to: OrderStatus; userId: string; now: Date },
): Promise<{ updated: number; skipped: number; stockCrossedZero: boolean }> {
  let updated = 0;
  let stockCrossedZero = false;
  for (const orderId of a.orderIds) {
    const r = await changeOrderStatus(db, { orderId, to: a.to, userId: a.userId, now: a.now });
    if (r.ok) {
      updated += 1;
      stockCrossedZero ||= r.stockCrossedZero;
    }
  }
  return { updated, skipped: a.orderIds.length - updated, stockCrossedZero };
}

export async function addOrderNote(db: Db, a: { orderId: string; userId: string; note: string; now?: Date }): Promise<void> {
  const note = a.note.trim().slice(0, 1000);
  if (!note) return;
  await db.insert(orderEvents).values({
    orderId: a.orderId,
    type: 'note',
    note,
    userId: a.userId,
    createdAt: a.now ?? new Date(),
  });
}

export type TrackView = {
  number: number;
  status: OrderStatus;
  createdAt: string;
  items: { bundleName: L10n; quantity: number }[];
  totalCents: number;
  timeline: { status: OrderStatus; at: string }[];
};

async function buildTrackView(db: Db, order: typeof orders.$inferSelect): Promise<TrackView> {
  const [items, evs] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db
      .select({ toStatus: orderEvents.toStatus, createdAt: orderEvents.createdAt })
      .from(orderEvents)
      .where(and(eq(orderEvents.orderId, order.id), inArray(orderEvents.type, ['created', 'status_changed'])))
      .orderBy(asc(orderEvents.createdAt)),
  ]);
  return {
    number: order.number,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    items: items.map((i) => ({ bundleName: { en: i.bundleNameEn, ar: i.bundleNameAr }, quantity: i.quantity })),
    totalCents: order.totalCents,
    timeline: evs.filter((e) => e.toStatus).map((e) => ({ status: e.toStatus!, at: e.createdAt.toISOString() })),
  };
}

/** Public order tracking: the number and the phone must both match. Never exposes notes or address. */
export async function trackOrder(db: Db, a: { number: number; phone: string }): Promise<TrackView | null> {
  const phone = normalizeLebanesePhone(a.phone);
  if (!phone || !Number.isInteger(a.number)) return null;
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.number, a.number), eq(orders.phone, phone)))
    .limit(1);
  return order ? buildTrackView(db, order) : null;
}

export async function getOrderForConfirmation(
  db: Db,
  orderId: string,
): Promise<(TrackView & { id: string; name: string; district: string }) | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  return { ...(await buildTrackView(db, order)), id: order.id, name: order.name, district: order.district };
}
