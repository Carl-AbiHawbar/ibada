import { afterEach, beforeEach, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../helpers/db';
import { seeded } from '../helpers/fixtures';
import { placeTestOrder } from '../helpers/orders';
import { adminSearch } from '@/server/admin/search';
import type { SeededCatalog } from '@/server/db/seed';

let t: TestDb;
let s: SeededCatalog;
beforeEach(async () => {
  t = await createTestDb();
  s = await seeded(t.db);
});
afterEach(() => t.close());

it('finds orders by number, name and phone, and customers by name', async () => {
  const a = await placeTestOrder(t.db, s.bundleIds.double, { name: 'Ali Haddad', phone: '03 123 456' });
  await placeTestOrder(t.db, s.bundleIds.single, { name: 'Maya Khoury', phone: '70 999 888' });

  const byNumber = await adminSearch(t.db, String(a.orderNumber), 'owner');
  expect(byNumber.orders.map((o) => o.number)).toEqual([a.orderNumber]);

  const byName = await adminSearch(t.db, 'khou', 'owner');
  expect(byName.orders.map((o) => o.name)).toEqual(['Maya Khoury']);
  expect(byName.customers.map((c) => c.name)).toEqual(['Maya Khoury']);

  const byPhone = await adminSearch(t.db, '03 123 456', 'owner');
  expect(byPhone.orders[0]).toMatchObject({ name: 'Ali Haddad', status: 'new', totalCents: 3599 });
  expect(byPhone.customers.map((c) => c.name)).toEqual(['Ali Haddad']);
});

it('finds products by English or Arabic name', async () => {
  expect((await adminSearch(t.db, 'ibada', 'staff')).products.map((p) => p.nameEn)).toEqual(['IBADA ONE']);
  expect((await adminSearch(t.db, 'nothing like this', 'staff')).products).toEqual([]);
});

it('lists matching admin pages the role may open', async () => {
  expect((await adminSearch(t.db, 'sett', 'owner')).pages.map((p) => p.href)).toEqual(['/admin/settings']);
  expect((await adminSearch(t.db, 'sett', 'staff')).pages).toEqual([]);
});

it('returns nothing for a blank query and caps each group at five', async () => {
  for (let i = 0; i < 7; i++) await placeTestOrder(t.db, s.bundleIds.single, { name: `Rami ${i}`, phone: `70 000 10${i}` });
  expect(await adminSearch(t.db, '  ', 'owner')).toEqual({ orders: [], customers: [], products: [], pages: [] });
  const r = await adminSearch(t.db, 'rami', 'owner');
  expect(r.orders).toHaveLength(5);
  expect(r.customers).toHaveLength(5);
});
