import { afterEach, beforeEach, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../helpers/db';
import { seeded } from '../helpers/fixtures';
import { insertStaff, placeTestOrder } from '../helpers/orders';
import { getOrderDetail, getOrdersForExport, listOrders } from '@/server/orders/admin-query';
import { addOrderNote, changeOrderStatus } from '@/server/orders/manage';
import type { SeededCatalog } from '@/server/db/seed';

let t: TestDb;
let s: SeededCatalog;
beforeEach(async () => {
  t = await createTestDb();
  s = await seeded(t.db);
});
afterEach(() => t.close());

it('searches by number, phone digits and name', async () => {
  const a = await placeTestOrder(t.db, s.bundleIds.double, { name: 'Ali Haddad', phone: '03 123 456' });
  await placeTestOrder(t.db, s.bundleIds.single, { name: 'Maya Khoury', phone: '70 999 888' });

  expect((await listOrders(t.db, { q: String(a.orderNumber), page: 1 })).rows.map((r) => r.number)).toEqual([a.orderNumber]);
  expect((await listOrders(t.db, { q: '3123456', page: 1 })).rows.map((r) => r.name)).toEqual(['Ali Haddad']);
  expect((await listOrders(t.db, { q: '03 123 456', page: 1 })).rows.map((r) => r.name)).toEqual(['Ali Haddad']);
  expect((await listOrders(t.db, { q: 'khou', page: 1 })).rows.map((r) => r.name)).toEqual(['Maya Khoury']);
  expect((await listOrders(t.db, { q: 'nobody', page: 1 })).total).toBe(0);
});

it('filters by status and date and summarizes items', async () => {
  const userId = await insertStaff(t.db);
  const a = await placeTestOrder(t.db, s.bundleIds.double, { phone: '70 000 001' });
  await placeTestOrder(t.db, s.bundleIds.single, { phone: '70 000 002' });
  await changeOrderStatus(t.db, { orderId: a.orderId, to: 'confirmed', userId, now: new Date() });

  const confirmed = await listOrders(t.db, { status: 'confirmed', page: 1 });
  expect(confirmed.total).toBe(1);
  expect(confirmed.rows[0]).toMatchObject({ status: 'confirmed', itemsSummary: 'Multi-Room Protection ×1', totalCents: 3600 });
  expect((await listOrders(t.db, { from: new Date('2030-01-01'), page: 1 })).total).toBe(0);
});

it('paginates 25 per page, newest first', async () => {
  for (let i = 0; i < 30; i++) {
    await placeTestOrder(t.db, s.bundleIds.single, { phone: `71 000 ${String(i).padStart(3, '0')}` });
  }
  const p1 = await listOrders(t.db, { page: 1 });
  const p2 = await listOrders(t.db, { page: 2 });
  expect(p1.total).toBe(30);
  expect(p1.rows).toHaveLength(25);
  expect(p2.rows).toHaveLength(5);
  expect(p1.rows[0]!.number).toBeGreaterThan(p2.rows[0]!.number);
});

it('detail includes items, customer and events with actor names', async () => {
  const userId = await insertStaff(t.db, { name: 'Baraa' });
  const a = await placeTestOrder(t.db, s.bundleIds.double);
  await placeTestOrder(t.db, s.bundleIds.single);
  await addOrderNote(t.db, { orderId: a.orderId, userId, note: 'Called', now: new Date() });
  const d = (await getOrderDetail(t.db, a.orderId))!;
  expect(d.order).toMatchObject({ number: a.orderNumber, landmark: 'Near the pharmacy', totalCents: 3600 });
  expect(d.items).toMatchObject([{ bundleNameEn: 'Multi-Room Protection', quantity: 1 }]);
  expect(d.customer).toMatchObject({ orderCount: 2, blocked: false });
  expect(d.events.map((e) => [e.type, e.actorName])).toEqual([
    ['created', null],
    ['note', 'Baraa'],
  ]);
  expect(await getOrderDetail(t.db, crypto.randomUUID())).toBeNull();
});

it('export rows carry full address and items', async () => {
  await placeTestOrder(t.db, s.bundleIds.double);
  const rows = await getOrdersForExport(t.db, {});
  expect(rows).toMatchObject([
    { governorate: 'beirut', district: 'beirut', landmark: 'Near the pharmacy', items: 'Multi-Room Protection x1', totalCents: 3600 },
  ]);
});
