import { afterEach, beforeEach, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../helpers/db';
import { seeded } from '../helpers/fixtures';
import { insertStaff, placeTestOrder } from '../helpers/orders';
import { customers, discountRedemptions, discounts, inventoryMovements, orderEvents, orders, products } from '@/server/db/schema';
import {
  addOrderNote,
  bulkChangeStatus,
  changeOrderStatus,
  getOrderForConfirmation,
  trackOrder,
} from '@/server/orders/manage';
import type { SeededCatalog } from '@/server/db/seed';

let t: TestDb;
let s: SeededCatalog;
let userId: string;
const now = new Date('2026-09-27T12:00:00Z');

beforeEach(async () => {
  t = await createTestDb();
  s = await seeded(t.db);
  userId = await insertStaff(t.db);
});
afterEach(() => t.close());

const stock = async () => (await t.db.select().from(products))[0]!.stockUnits;
const customer = async () => (await t.db.select().from(customers))[0]!;
const move = (orderId: string, to: Parameters<typeof changeOrderStatus>[1]['to']) =>
  changeOrderStatus(t.db, { orderId, to, userId, now });

it('walks the happy path and records events', async () => {
  const { orderId } = await placeTestOrder(t.db, s.bundleIds.double);
  expect(await move(orderId, 'confirmed')).toEqual({ ok: true, stockCrossedZero: false });
  expect(await move(orderId, 'out_for_delivery')).toMatchObject({ ok: true });
  expect(await move(orderId, 'delivered')).toMatchObject({ ok: true });

  const [o] = await t.db.select().from(orders);
  expect(o).toMatchObject({ status: 'delivered', paymentStatus: 'paid' });
  expect(await customer()).toMatchObject({ totalSpentCents: 3599, orderCount: 1 });
  const evs = await t.db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId));
  expect(evs).toHaveLength(4);
  expect(evs.filter((e) => e.type === 'status_changed').map((e) => [e.fromStatus, e.toStatus, e.userId])).toEqual([
    ['new', 'confirmed', userId],
    ['confirmed', 'out_for_delivery', userId],
    ['out_for_delivery', 'delivered', userId],
  ]);
  expect(await stock()).toBe(98);
});

it('rejects invalid transitions and unknown orders', async () => {
  const { orderId } = await placeTestOrder(t.db, s.bundleIds.double);
  expect(await move(orderId, 'delivered')).toEqual({ ok: false, error: 'invalid_transition' });
  expect(await move(crypto.randomUUID(), 'confirmed')).toEqual({ ok: false, error: 'not_found' });
});

it('cancel restocks, releases the discount and decrements the order count', async () => {
  await t.db.insert(discounts).values({ code: 'WELCOME10', type: 'percent', value: 10, oncePerPhone: true });
  const { orderId } = await placeTestOrder(t.db, s.bundleIds.double, { discountCode: 'WELCOME10' });
  expect(await stock()).toBe(98);
  expect(await move(orderId, 'cancelled')).toMatchObject({ ok: true });

  expect(await stock()).toBe(100);
  expect(await t.db.select().from(inventoryMovements).where(eq(inventoryMovements.reason, 'cancel'))).toMatchObject([
    { deltaUnits: 2, orderId, userId },
  ]);
  expect((await t.db.select().from(discounts))[0]!.usedCount).toBe(0);
  expect(await t.db.select().from(discountRedemptions)).toEqual([]);
  expect(await customer()).toMatchObject({ orderCount: 0 });
  // The code can be used again by the same phone.
  await placeTestOrder(t.db, s.bundleIds.double, { discountCode: 'WELCOME10' });
});

it('return restocks and reverses spend but stays paid', async () => {
  const { orderId } = await placeTestOrder(t.db, s.bundleIds.double);
  for (const to of ['confirmed', 'out_for_delivery', 'delivered', 'returned'] as const) await move(orderId, to);
  expect(await stock()).toBe(100);
  expect(await t.db.select().from(inventoryMovements).where(eq(inventoryMovements.reason, 'return'))).toMatchObject([
    { deltaUnits: 2 },
  ]);
  expect(await customer()).toMatchObject({ totalSpentCents: 0, orderCount: 1 });
  expect((await t.db.select().from(orders))[0]).toMatchObject({ status: 'returned', paymentStatus: 'paid' });
});

it('restores stock exactly once when two admins cancel at once', async () => {
  const { orderId } = await placeTestOrder(t.db, s.bundleIds.double);
  const rs = await Promise.all([move(orderId, 'cancelled'), move(orderId, 'cancelled')]);
  expect(rs.filter((r) => r.ok)).toHaveLength(1);
  expect(rs.find((r) => !r.ok)).toEqual({ ok: false, error: 'conflict' });
  expect(await t.db.select().from(inventoryMovements).where(eq(inventoryMovements.reason, 'cancel'))).toHaveLength(1);
  expect(await stock()).toBe(100);
});

it('reports restock from zero', async () => {
  await t.db.update(products).set({ stockUnits: 2 });
  const { orderId } = await placeTestOrder(t.db, s.bundleIds.double);
  expect(await stock()).toBe(0);
  expect(await move(orderId, 'cancelled')).toEqual({ ok: true, stockCrossedZero: true });
});

it('bulk changes only valid orders', async () => {
  const a = await placeTestOrder(t.db, s.bundleIds.single, { phone: '70 000 001' });
  const b = await placeTestOrder(t.db, s.bundleIds.single, { phone: '70 000 002' });
  const c = await placeTestOrder(t.db, s.bundleIds.single, { phone: '70 000 003' });
  for (const to of ['confirmed', 'out_for_delivery', 'delivered'] as const) await move(c.orderId, to);
  expect(await bulkChangeStatus(t.db, { orderIds: [a.orderId, b.orderId, c.orderId], to: 'confirmed', userId, now })).toEqual({
    updated: 2,
    skipped: 1,
    stockCrossedZero: false,
  });
});

it('tracks by number and any phone format, hiding notes', async () => {
  const { orderId, orderNumber } = await placeTestOrder(t.db, s.bundleIds.double);
  await addOrderNote(t.db, { orderId, userId, note: 'SECRET-NOTE', now });
  await move(orderId, 'confirmed');

  const v = await trackOrder(t.db, { number: orderNumber, phone: '٠٣ ١٢٣ ٤٥٦' });
  expect(v).toMatchObject({
    number: orderNumber,
    status: 'confirmed',
    totalCents: 3599,
    items: [{ bundleName: { en: 'Multi-Room Protection', ar: 'حماية عدة غرف' }, quantity: 1 }],
  });
  expect(v!.timeline.map((e) => e.status)).toEqual(['new', 'confirmed']);
  expect(JSON.stringify(v)).not.toContain('SECRET-NOTE');
  expect(JSON.stringify(v)).not.toContain('Hamra');
  expect(await trackOrder(t.db, { number: orderNumber, phone: '70 123 456' })).toBeNull();
  expect(await trackOrder(t.db, { number: orderNumber, phone: 'garbage' })).toBeNull();

  const notes = await t.db.select().from(orderEvents).where(eq(orderEvents.type, 'note'));
  expect(notes).toMatchObject([{ note: 'SECRET-NOTE', userId }]);
});

it('confirmation view', async () => {
  const { orderId, orderNumber } = await placeTestOrder(t.db, s.bundleIds.double);
  expect(await getOrderForConfirmation(t.db, orderId)).toMatchObject({
    id: orderId,
    number: orderNumber,
    name: 'Ali Haddad',
    district: 'beirut',
    status: 'new',
  });
  expect(await getOrderForConfirmation(t.db, crypto.randomUUID())).toBeNull();
});
