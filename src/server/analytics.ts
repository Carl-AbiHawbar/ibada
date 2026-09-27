import { and, asc, countDistinct, desc, gte, inArray, lt, lte, notInArray, sql } from 'drizzle-orm';
import { addDays, beirutDateKey, type DateRange } from '@/lib/dates';
import type { Db } from './db/client';
import { events, orderItems, orders, products } from './db/schema';

export type FunnelEvent = 'view_product' | 'add_to_cart' | 'begin_checkout' | 'order_placed';

/** Record one anonymous funnel step for a browser session. */
export async function recordEvent(
  db: Db,
  e: { type: FunnelEvent; sessionId: string; locale: 'en' | 'ar'; now?: Date },
): Promise<void> {
  await db.insert(events).values({ type: e.type, sessionId: e.sessionId, locale: e.locale, createdAt: e.now ?? new Date() });
}

// Sales exclude cancelled and returned orders (spec §6 "Revenue definitions").
const COUNTED = notInArray(orders.status, ['cancelled', 'returned']);
const inRange = (r: DateRange) => and(gte(orders.createdAt, r.from), lt(orders.createdAt, r.to));

export type Summary = { salesCents: number; orders: number; aovCents: number; collectedCents: number; pendingCents: number };

export async function dashboardSummary(db: Db, r: DateRange): Promise<Summary> {
  const [row] = await db
    .select({
      sales: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.status} not in ('cancelled','returned')), 0)`.mapWith(Number),
      count: sql<number>`count(*) filter (where ${orders.status} not in ('cancelled','returned'))`.mapWith(Number),
      collected: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.status} = 'delivered'), 0)`.mapWith(Number),
      pending: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.status} in ('new','confirmed','out_for_delivery')), 0)`.mapWith(
        Number,
      ),
    })
    .from(orders)
    .where(inRange(r));
  const sales = row?.sales ?? 0;
  const count = row?.count ?? 0;
  return {
    salesCents: sales,
    orders: count,
    aovCents: count ? Math.round(sales / count) : 0,
    collectedCents: row?.collected ?? 0,
    pendingCents: row?.pending ?? 0,
  };
}

export type SeriesPoint = { date: string; salesCents: number; orders: number };

/** One point per Beirut calendar day in the range, zero-filled (bucketed in JS so DST is exact). */
export async function salesSeries(db: Db, r: DateRange): Promise<SeriesPoint[]> {
  const rows = await db
    .select({ createdAt: orders.createdAt, totalCents: orders.totalCents })
    .from(orders)
    .where(and(inRange(r), COUNTED));
  const days: SeriesPoint[] = [];
  const last = beirutDateKey(new Date(r.to.getTime() - 1));
  for (let d = beirutDateKey(r.from); d <= last && days.length < 400; d = addDays(d, 1)) {
    days.push({ date: d, salesCents: 0, orders: 0 });
  }
  const index = new Map(days.map((d, i) => [d.date, i]));
  for (const o of rows) {
    const i = index.get(beirutDateKey(o.createdAt));
    if (i === undefined) continue;
    days[i]!.salesCents += o.totalCents;
    days[i]!.orders += 1;
  }
  return days;
}

export type Funnel = { views: number; addToCart: number; checkout: number; orders: number; conversionPct: number };

export async function funnel(db: Db, r: DateRange): Promise<Funnel> {
  const rows = await db
    .select({ type: events.type, n: countDistinct(events.sessionId) })
    .from(events)
    .where(and(gte(events.createdAt, r.from), lt(events.createdAt, r.to)))
    .groupBy(events.type);
  const n = (t: FunnelEvent) => rows.find((x) => x.type === t)?.n ?? 0;
  const views = n('view_product');
  const placed = n('order_placed');
  return {
    views,
    addToCart: n('add_to_cart'),
    checkout: n('begin_checkout'),
    orders: placed,
    conversionPct: views ? Math.round((placed / views) * 1000) / 10 : 0,
  };
}

export async function topBundles(db: Db, r: DateRange, limit = 5) {
  const units = sql<number>`sum(${orderItems.unitsPerBundle} * ${orderItems.quantity})`.mapWith(Number);
  const revenue = sql<number>`sum(${orderItems.lineTotalCents})`.mapWith(Number);
  return db
    .select({ name: orderItems.bundleNameEn, units, revenueCents: revenue })
    .from(orderItems)
    .innerJoin(orders, sql`${orders.id} = ${orderItems.orderId}`)
    .where(and(inRange(r), COUNTED))
    .groupBy(orderItems.bundleNameEn)
    .orderBy(desc(units), desc(revenue))
    .limit(limit);
}

export async function ordersByGovernorate(db: Db, r: DateRange) {
  const n = sql<number>`count(*)`.mapWith(Number);
  return db
    .select({ governorate: orders.governorate, orders: n })
    .from(orders)
    .where(and(inRange(r), COUNTED))
    .groupBy(orders.governorate)
    .orderBy(desc(n), asc(orders.governorate));
}

export async function lowStock(db: Db) {
  return db
    .select({ productId: products.id, name: products.nameEn, stockUnits: products.stockUnits, threshold: products.lowStockThreshold })
    .from(products)
    .where(and(lte(products.stockUnits, products.lowStockThreshold), inArray(products.status, ['active', 'draft'])))
    .orderBy(asc(products.stockUnits));
}
