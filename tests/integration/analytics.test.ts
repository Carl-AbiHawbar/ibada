import { afterEach, beforeEach, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../helpers/db';
import { seeded } from '../helpers/fixtures';
import { customers, events, orderItems, orders, products } from '@/server/db/schema';
import { dashboardSummary, funnel, lowStock, ordersByGovernorate, salesSeries, topBundles } from '@/server/analytics';
import { rangeForPreset } from '@/lib/dates';
import type { SeededCatalog } from '@/server/db/seed';

let t: TestDb;
let s: SeededCatalog;
let customerId: string;
const now = new Date('2026-09-27T09:00:00Z');

beforeEach(async () => {
  t = await createTestDb();
  s = await seeded(t.db);
  const [c] = await t.db.insert(customers).values({ phone: '+9613123456', name: 'Ali' }).returning();
  customerId = c!.id;
});
afterEach(() => t.close());

type OrderOpts = {
  total?: number;
  status?: 'new' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';
  governorate?: string;
  bundle?: { name: string; units: number; quantity?: number; price?: number };
};

async function orderAt(createdAt: string, o: OrderOpts = {}) {
  const total = o.total ?? 3600;
  const [row] = await t.db
    .insert(orders)
    .values({
      idempotencyKey: crypto.randomUUID(),
      customerId,
      locale: 'en',
      name: 'Ali',
      phone: '+9613123456',
      governorate: o.governorate ?? 'beirut',
      district: 'beirut',
      town: 'Beirut',
      addressLine: 'Street 1',
      subtotalCents: total,
      totalCents: total,
      status: o.status ?? 'new',
      ipHash: 'x',
      createdAt: new Date(createdAt),
    })
    .returning();
  const b = o.bundle ?? { name: 'Multi-Room Protection', units: 2 };
  const qty = b.quantity ?? 1;
  await t.db.insert(orderItems).values({
    orderId: row!.id,
    productNameEn: 'IBADA ONE',
    productNameAr: 'IBADA ONE',
    bundleNameEn: b.name,
    bundleNameAr: b.name,
    unitsPerBundle: b.units,
    quantity: qty,
    unitPriceCents: b.price ?? total,
    lineTotalCents: (b.price ?? total) * qty,
  });
  return row!;
}

it('counts a 00:30 Beirut order in today and in its Beirut day', async () => {
  await orderAt('2026-09-26T21:30:00Z', { total: 3600 });
  await orderAt('2026-09-26T20:30:00Z', { total: 2000 }); // 23:30 Beirut on the 26th
  expect((await dashboardSummary(t.db, rangeForPreset('today', now))).orders).toBe(1);
  const series = await salesSeries(t.db, rangeForPreset('7d', now));
  expect(series.at(-1)).toEqual({ date: '2026-09-27', salesCents: 3600, orders: 1 });
  expect(series.at(-2)).toEqual({ date: '2026-09-26', salesCents: 2000, orders: 1 });
});

it('revenue definitions', async () => {
  await orderAt('2026-09-27T06:00:00Z', { total: 3600, status: 'new' });
  await orderAt('2026-09-27T06:10:00Z', { total: 5100, status: 'delivered' });
  await orderAt('2026-09-27T06:20:00Z', { total: 2000, status: 'cancelled' });
  await orderAt('2026-09-27T06:30:00Z', { total: 6000, status: 'returned' });
  expect(await dashboardSummary(t.db, rangeForPreset('today', now))).toEqual({
    salesCents: 8700,
    orders: 2,
    aovCents: 4350,
    collectedCents: 5100,
    pendingCents: 3600,
  });
});

it('empty ranges report zeros, not NaN', async () => {
  expect(await dashboardSummary(t.db, rangeForPreset('today', now))).toEqual({
    salesCents: 0,
    orders: 0,
    aovCents: 0,
    collectedCents: 0,
    pendingCents: 0,
  });
  expect((await funnel(t.db, rangeForPreset('today', now))).conversionPct).toBe(0);
});

it('series is zero-filled, one entry per Beirut day', async () => {
  const series = await salesSeries(t.db, rangeForPreset('7d', now));
  expect(series.map((d) => d.date)).toEqual([
    '2026-09-21',
    '2026-09-22',
    '2026-09-23',
    '2026-09-24',
    '2026-09-25',
    '2026-09-26',
    '2026-09-27',
  ]);
  expect(series.every((d) => d.salesCents === 0 && d.orders === 0)).toBe(true);
});

it('funnel counts distinct sessions per step', async () => {
  const at = new Date('2026-09-27T06:00:00Z');
  const ev = (type: 'view_product' | 'add_to_cart' | 'begin_checkout' | 'order_placed', sessionId: string) => ({
    type,
    sessionId,
    locale: 'en' as const,
    createdAt: at,
  });
  await t.db.insert(events).values([
    ev('view_product', 's1'),
    ev('view_product', 's1'),
    ev('view_product', 's2'),
    ev('view_product', 's3'),
    ev('add_to_cart', 's1'),
    ev('add_to_cart', 's2'),
    ev('begin_checkout', 's1'),
    ev('order_placed', 's1'),
  ]);
  expect(await funnel(t.db, rangeForPreset('today', now))).toEqual({ views: 3, addToCart: 2, checkout: 1, orders: 1, conversionPct: 33.3 });
});

it('top bundles by devices sold, then revenue; cancelled orders excluded', async () => {
  await orderAt('2026-09-27T06:00:00Z', { total: 3600 });
  await orderAt('2026-09-27T06:05:00Z', { total: 3600 });
  await orderAt('2026-09-27T06:10:00Z', { total: 6000, bundle: { name: 'Full Home Protection', units: 4 } });
  await orderAt('2026-09-27T06:15:00Z', { total: 2000, status: 'cancelled', bundle: { name: 'Single Room Protection', units: 1 } });
  expect(await topBundles(t.db, rangeForPreset('today', now))).toEqual([
    { name: 'Multi-Room Protection', units: 4, revenueCents: 7200 },
    { name: 'Full Home Protection', units: 4, revenueCents: 6000 },
  ]);
});

it('orders by governorate', async () => {
  await orderAt('2026-09-27T06:00:00Z', { governorate: 'beirut' });
  await orderAt('2026-09-27T06:05:00Z', { governorate: 'mount-lebanon' });
  await orderAt('2026-09-27T06:10:00Z', { governorate: 'mount-lebanon' });
  await orderAt('2026-09-27T06:15:00Z', { governorate: 'south', status: 'cancelled' });
  expect(await ordersByGovernorate(t.db, rangeForPreset('today', now))).toEqual([
    { governorate: 'mount-lebanon', orders: 2 },
    { governorate: 'beirut', orders: 1 },
  ]);
});

it('low stock', async () => {
  expect(await lowStock(t.db)).toEqual([]);
  await t.db.update(products).set({ stockUnits: 5, lowStockThreshold: 10 });
  expect(await lowStock(t.db)).toMatchObject([{ productId: s.productId, name: 'IBADA ONE', stockUnits: 5, threshold: 10 }]);
});
