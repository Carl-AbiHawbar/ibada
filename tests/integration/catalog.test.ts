import { afterEach, beforeEach, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../helpers/db';
import { seeded } from '../helpers/fixtures';
import { bundles, products } from '@/server/db/schema';
import { getFeaturedProduct, getProductBySlug, listActiveProducts, quoteCart } from '@/server/catalog';
import type { SeededCatalog } from '@/server/db/seed';

let t: TestDb;
let s: SeededCatalog;
beforeEach(async () => {
  t = await createTestDb();
  s = await seeded(t.db);
});
afterEach(() => t.close());

test('featured product exposes computed bundle pricing', async () => {
  const p = (await getFeaturedProduct(t.db))!;
  expect(p.slug).toBe('ibada-one');
  expect(p.name).toEqual({ en: 'IBADA ONE', ar: 'IBADA ONE' });
  expect(p.bundles.map((b) => b.name.en)).toEqual([
    'Single Room Protection',
    'Multi-Room Protection',
    'Family Pack',
    'Full Home Protection',
  ]);
  expect(p.bundles.map((b) => [b.savePercent, b.perUnitCents])).toEqual([
    [33, 2000],
    [40, 1800],
    [43, 1700],
    [50, 1500],
  ]);
  expect(p.bundles.map((b) => b.imageUrl)).toEqual([
    '/images/products/ibada-one-single.webp',
    '/images/products/ibada-one-double.webp',
    '/images/products/ibada-one-triple.webp',
    '/images/products/ibada-one-full.webp',
  ]);
  expect(p.bundles.find((b) => b.isDefault)?.name.en).toBe('Multi-Room Protection');
  expect(p.images).toHaveLength(4);
  expect(p.inStock).toBe(true);
  expect(JSON.parse(JSON.stringify(p))).toEqual(p);
});

test('inactive bundles are hidden', async () => {
  await t.db.update(bundles).set({ active: false }).where(eq(bundles.id, s.bundleIds.triple));
  expect((await getProductBySlug(t.db, 'ibada-one'))!.bundles).toHaveLength(3);
});

test('draft products are invisible', async () => {
  await t.db.update(products).set({ status: 'draft' }).where(eq(products.id, s.productId));
  expect(await getProductBySlug(t.db, 'ibada-one')).toBeNull();
  expect(await getFeaturedProduct(t.db)).toBeNull();
  expect(await listActiveProducts(t.db)).toEqual([]);
});

test('unknown slug is null', async () => {
  expect(await getProductBySlug(t.db, 'nope')).toBeNull();
});

test('out of stock', async () => {
  await t.db.update(products).set({ stockUnits: 0 });
  expect((await getFeaturedProduct(t.db))!.inStock).toBe(false);
});

test('quoteCart merges, clamps and removes unknown lines', async () => {
  const unknown = '00000000-0000-4000-8000-000000000000';
  const q = await quoteCart(t.db, [
    { bundleId: s.bundleIds.double, quantity: 1 },
    { bundleId: s.bundleIds.double, quantity: 20 },
    { bundleId: unknown, quantity: 1 },
  ]);
  expect(q.lines).toMatchObject([
    {
      bundleId: s.bundleIds.double,
      productId: s.productId,
      quantity: 10,
      units: 2,
      unitPriceCents: 3600,
      lineTotalCents: 36000,
      bundleName: { en: 'Multi-Room Protection', ar: 'حماية عدة غرف' },
      productName: { en: 'IBADA ONE' },
      imageUrl: '/images/products/ibada-one-double.webp',
    },
  ]);
  expect(q.removed).toEqual([unknown]);
  expect(q.subtotalCents).toBe(36000);
});

test('quoteCart prices two bundles', async () => {
  const q = await quoteCart(t.db, [
    { bundleId: s.bundleIds.single, quantity: 2 },
    { bundleId: s.bundleIds.full, quantity: 1 },
  ]);
  expect(q.subtotalCents).toBe(2 * 2000 + 6000);
  expect(q.removed).toEqual([]);
});

test('stale cart: bundle deactivated since it was added', async () => {
  await t.db.update(bundles).set({ active: false }).where(eq(bundles.id, s.bundleIds.single));
  const q = await quoteCart(t.db, [{ bundleId: s.bundleIds.single, quantity: 1 }]);
  expect(q.removed).toEqual([s.bundleIds.single]);
  expect(q.lines).toEqual([]);
  expect(q.subtotalCents).toBe(0);
});

test('stale cart: price changed since it was added uses the current price', async () => {
  await t.db.update(bundles).set({ priceCents: 2200 }).where(eq(bundles.id, s.bundleIds.single));
  expect((await quoteCart(t.db, [{ bundleId: s.bundleIds.single, quantity: 1 }])).subtotalCents).toBe(2200);
});

test('quoteCart removes lines of draft products and lines exceeding stock', async () => {
  await t.db.update(products).set({ stockUnits: 3 });
  const q = await quoteCart(t.db, [
    { bundleId: s.bundleIds.full, quantity: 1 }, // needs 4 units
    { bundleId: s.bundleIds.single, quantity: 1 },
  ]);
  expect(q.removed).toEqual([s.bundleIds.full]);
  expect(q.lines.map((l) => l.bundleId)).toEqual([s.bundleIds.single]);

  await t.db.update(products).set({ status: 'draft', stockUnits: 100 });
  expect((await quoteCart(t.db, [{ bundleId: s.bundleIds.single, quantity: 1 }])).removed).toEqual([s.bundleIds.single]);
});
