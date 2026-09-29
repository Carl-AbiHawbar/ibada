import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../helpers/db';
import { seeded } from '../helpers/fixtures';
import { checkoutInput, orderContext } from '../helpers/orders';
import {
  bundles,
  customers,
  discountRedemptions,
  discounts,
  events,
  inventoryMovements,
  orderEvents,
  orderItems,
  orders,
  products,
  settings,
} from '@/server/db/schema';
import { placeOrder } from '@/server/orders/place-order';
import type { SeededCatalog } from '@/server/db/seed';

let t: TestDb;
let s: SeededCatalog;
beforeEach(async () => {
  t = await createTestDb();
  s = await seeded(t.db);
});
afterEach(() => t.close());

const valid = (over: Record<string, unknown> = {}) => checkoutInput(s.bundleIds.double, over);
const stock = async () => (await t.db.select().from(products))[0]!.stockUnits;

it('places an order', async () => {
  const ctx = orderContext();
  const r = await placeOrder(t.db, valid(), ctx);
  expect(r).toMatchObject({ ok: true, orderNumber: 1001, duplicate: false, stockCrossedZero: false });

  const [o] = await t.db.select().from(orders);
  expect(o).toMatchObject({
    status: 'new',
    paymentStatus: 'pending',
    subtotalCents: 3600,
    discountCents: 0,
    deliveryCents: 0,
    totalCents: 3600,
    phone: '+9613123456',
    name: 'Ali Haddad',
    governorate: 'beirut',
    district: 'beirut',
    landmark: 'Near the pharmacy',
    locale: 'en',
  });
  expect(o!.ipHash).toMatch(/^[0-9a-f]{64}$/);
  expect(await t.db.select().from(orderItems)).toMatchObject([
    {
      bundleNameEn: 'Multi-Room Protection',
      bundleNameAr: 'حماية عدة غرف',
      productNameEn: 'IBADA ONE',
      unitsPerBundle: 2,
      quantity: 1,
      unitPriceCents: 3600,
      lineTotalCents: 3600,
    },
  ]);
  expect(await stock()).toBe(98);
  expect(await t.db.select().from(inventoryMovements).where(eq(inventoryMovements.reason, 'order'))).toMatchObject([
    { deltaUnits: -2, orderId: o!.id },
  ]);
  expect(await t.db.select().from(customers)).toMatchObject([{ phone: '+9613123456', orderCount: 1, name: 'Ali Haddad' }]);
  expect(await t.db.select().from(orderEvents)).toMatchObject([{ type: 'created', toStatus: 'new' }]);
  expect(await t.db.select().from(events)).toMatchObject([{ type: 'order_placed', sessionId: 's1', locale: 'en' }]);
  expect(ctx.notify).toHaveBeenCalledTimes(1);
  expect(ctx.notify).toHaveBeenCalledWith({
    id: o!.id,
    number: 1001,
    totalCents: 3600,
    district: 'Beirut',
    items: [{ bundleName: 'Multi-Room Protection', quantity: 1 }],
  });
});

it('is idempotent', async () => {
  const ctx = orderContext();
  const input = valid();
  expect(await placeOrder(t.db, input, ctx)).toMatchObject({ ok: true, duplicate: false });
  expect(await placeOrder(t.db, input, ctx)).toMatchObject({ ok: true, duplicate: true, orderNumber: 1001 });
  expect(await t.db.select().from(orders)).toHaveLength(1);
  expect(ctx.verifyTurnstile).toHaveBeenCalledTimes(1);
  expect(ctx.notify).toHaveBeenCalledTimes(1);
  expect(await stock()).toBe(98);
});

it('ignores client-sent prices', async () => {
  const r = await placeOrder(
    t.db,
    valid({ cart: [{ bundleId: s.bundleIds.double, quantity: 1, priceCents: 1 }], totalCents: 1 }),
    orderContext(),
  );
  expect(r.ok).toBe(true);
  expect((await t.db.select().from(orders))[0]!.totalCents).toBe(3600);
});

it('rejects out of stock atomically', async () => {
  await t.db.update(products).set({ stockUnits: 3 });
  const r = await placeOrder(t.db, valid({ cart: [{ bundleId: s.bundleIds.full, quantity: 1 }] }), orderContext());
  expect(r).toMatchObject({ ok: false, error: 'out_of_stock', productName: { en: 'IBADA ONE', ar: 'IBADA ONE' } });
  expect(await stock()).toBe(3);
  expect(await t.db.select().from(orders)).toEqual([]);
  expect(await t.db.select().from(customers)).toEqual([]);
});

it('never oversells under concurrency', async () => {
  await t.db.update(products).set({ stockUnits: 4 });
  const family = [{ bundleId: s.bundleIds.triple, quantity: 1 }];
  const rs = await Promise.all([
    placeOrder(t.db, valid({ cart: family, phone: '70 111 111' }), orderContext({ ip: '2.2.2.2' })),
    placeOrder(t.db, valid({ cart: family, phone: '70 222 222' }), orderContext({ ip: '3.3.3.3' })),
  ]);
  expect(rs.filter((r) => r.ok)).toHaveLength(1);
  expect(rs.find((r) => !r.ok)).toMatchObject({ error: 'out_of_stock' });
  expect(await stock()).toBe(1);
});

it('reports stock crossing zero', async () => {
  await t.db.update(products).set({ stockUnits: 2 });
  expect(await placeOrder(t.db, valid(), orderContext())).toMatchObject({ ok: true, stockCrossedZero: true });
});

it('rejects a failed captcha without writing anything', async () => {
  const ctx = orderContext({ verifyTurnstile: vi.fn(async () => false) });
  expect(await placeOrder(t.db, valid(), ctx)).toEqual({ ok: false, error: 'captcha' });
  expect(await t.db.select().from(orders)).toEqual([]);
  expect(ctx.notify).not.toHaveBeenCalled();
});

it('rate-limits by phone and by IP', async () => {
  for (let i = 0; i < 3; i++) {
    expect((await placeOrder(t.db, valid(), orderContext({ ip: `9.9.9.${i}` }))).ok).toBe(true);
  }
  expect(await placeOrder(t.db, valid(), orderContext({ ip: '9.9.9.9' }))).toEqual({ ok: false, error: 'rate_limited' });

  for (let i = 0; i < 5; i++) {
    expect((await placeOrder(t.db, valid({ phone: `70 123 45${i}` }), orderContext({ ip: '5.5.5.5' }))).ok).toBe(true);
  }
  expect(await placeOrder(t.db, valid({ phone: '70 123 459' }), orderContext({ ip: '5.5.5.5' }))).toEqual({
    ok: false,
    error: 'rate_limited',
  });
});

it('rejects blocked phones', async () => {
  await t.db.insert(customers).values({ phone: '+9613123456', name: 'Fake', blocked: true, blockedReason: 'fake orders' });
  expect(await placeOrder(t.db, valid(), orderContext())).toEqual({ ok: false, error: 'blocked' });
  expect(await t.db.select().from(orders)).toEqual([]);
});

it('validates fields', async () => {
  expect(await placeOrder(t.db, valid({ phone: '01 123 456' }), orderContext())).toMatchObject({
    ok: false,
    error: 'invalid',
    fieldErrors: { phone: 'invalid_phone' },
  });
  expect(await placeOrder(t.db, valid({ governorate: 'beirut', district: 'tripoli' }), orderContext())).toMatchObject({
    ok: false,
    error: 'invalid',
    fieldErrors: { district: 'invalid_district' },
  });
  const eleven = Array.from({ length: 11 }, () => ({ bundleId: s.bundleIds.single, quantity: 1 }));
  expect(await placeOrder(t.db, valid({ cart: eleven }), orderContext())).toMatchObject({ ok: false, error: 'invalid' });
  expect(await placeOrder(t.db, valid({ name: ' ' }), orderContext())).toMatchObject({
    fieldErrors: { name: 'invalid_name' },
  });
  expect(await placeOrder(t.db, 'not an object', orderContext())).toMatchObject({ ok: false, error: 'invalid' });
});

it('reports a changed cart', async () => {
  await t.db.update(bundles).set({ active: false }).where(eq(bundles.id, s.bundleIds.double));
  expect(await placeOrder(t.db, valid(), orderContext())).toEqual({ ok: false, error: 'cart_changed' });
  expect(await stock()).toBe(100);
});

it('applies discounts and records the redemption', async () => {
  await t.db.insert(discounts).values([
    { code: 'WELCOME10', type: 'percent', value: 10 },
    { code: 'PERPHONE', type: 'fixed', value: 500, oncePerPhone: true },
  ]);
  expect(await placeOrder(t.db, valid({ discountCode: 'welcome10' }), orderContext())).toMatchObject({ ok: true });
  const [o] = await t.db.select().from(orders);
  expect(o).toMatchObject({ discountCents: 360, totalCents: 3240, discountCode: 'WELCOME10' });
  const [w] = await t.db.select().from(discounts).where(eq(discounts.code, 'WELCOME10'));
  expect(w!.usedCount).toBe(1);
  expect(await t.db.select().from(discountRedemptions)).toMatchObject([{ phone: '+9613123456', orderId: o!.id }]);

  expect(await placeOrder(t.db, valid({ discountCode: 'NOPE' }), orderContext())).toEqual({
    ok: false,
    error: 'discount_invalid',
    discountReason: 'not_found',
  });

  expect((await placeOrder(t.db, valid({ discountCode: 'PERPHONE', phone: '71 000 000' }), orderContext())).ok).toBe(true);
  expect(await placeOrder(t.db, valid({ discountCode: 'PERPHONE', phone: '71 000 000' }), orderContext())).toEqual({
    ok: false,
    error: 'discount_invalid',
    discountReason: 'already_used',
  });
});

it('enforces the last use of a limited code even when evaluated in parallel', async () => {
  await t.db.insert(discounts).values({ code: 'LAST', type: 'percent', value: 10, usageLimit: 1 });
  const rs = await Promise.all([
    placeOrder(t.db, valid({ discountCode: 'LAST', phone: '70 000 001' }), orderContext({ ip: '7.7.7.1' })),
    placeOrder(t.db, valid({ discountCode: 'LAST', phone: '70 000 002' }), orderContext({ ip: '7.7.7.2' })),
  ]);
  expect(rs.filter((r) => r.ok)).toHaveLength(1);
  expect((await t.db.select().from(discounts))[0]!.usedCount).toBe(1);
});

it('survives a failing notifier', async () => {
  const ctx = orderContext({ notify: vi.fn(async () => Promise.reject(new Error('push down'))) });
  expect(await placeOrder(t.db, valid(), ctx)).toMatchObject({ ok: true });
  expect(await t.db.select().from(orders)).toHaveLength(1);
});

it('charges the delivery fee setting', async () => {
  await t.db.update(settings).set({ deliveryFeeCents: 300 });
  await placeOrder(t.db, valid(), orderContext());
  expect((await t.db.select().from(orders))[0]).toMatchObject({ deliveryCents: 300, totalCents: 3900 });
});

it('a shopper who claimed free delivery pays no delivery fee', async () => {
  await t.db.update(settings).set({ deliveryFeeCents: 300 });
  await placeOrder(t.db, valid(), orderContext({ freeDelivery: true }));
  expect((await t.db.select().from(orders))[0]).toMatchObject({ deliveryCents: 0, totalCents: 3600 });
});
