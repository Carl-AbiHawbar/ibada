import { afterEach, beforeEach, expect, test } from 'vitest';
import { sql } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../helpers/db';
import { bundles, inventoryMovements, productImages, products, settings } from '@/server/db/schema';
import { seedCatalog, seedSettings } from '@/server/db/seed';

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.close());

test('seedCatalog is idempotent and matches the pricing sheet', async () => {
  const first = await seedCatalog(t.db);
  const second = await seedCatalog(t.db);
  expect(second).toEqual(first);

  const ps = await t.db.select().from(products);
  expect(ps).toHaveLength(1);
  expect(ps[0]).toMatchObject({ slug: 'ibada-one', nameEn: 'IBADA ONE', status: 'active', stockUnits: 100 });

  const bs = await t.db.select().from(bundles).orderBy(bundles.position);
  expect(bs.map((b) => b.units)).toEqual([1, 2, 3, 4]);
  expect(bs.map((b) => b.priceCents)).toEqual([2000, 3600, 5100, 6000]);
  expect(bs.map((b) => b.compareAtCents)).toEqual([3000, 6000, 9000, 12000]);
  expect(bs.map((b) => b.badge)).toEqual(['none', 'most_popular', 'none', 'best_value']);
  expect(bs.filter((b) => b.isDefault).map((b) => b.nameEn)).toEqual(['Multi-Room Protection']);
  expect(bs.map((b) => b.nameAr)).toEqual(['حماية غرفة واحدة', 'حماية عدة غرف', 'باقة العائلة', 'حماية المنزل بالكامل']);
  expect(bs.every((b) => b.imageId !== null)).toBe(true);

  const imgs = await t.db.select().from(productImages).orderBy(productImages.position);
  expect(imgs.map((i) => i.url)).toEqual([
    '/images/products/ibada-one-single.webp',
    '/images/products/ibada-one-double.webp',
    '/images/products/ibada-one-triple.webp',
    '/images/products/ibada-one-full.webp',
  ]);
  expect(imgs.every((i) => i.width > 0 && i.height > 0)).toBe(true);

  expect(await t.db.select().from(inventoryMovements)).toMatchObject([{ deltaUnits: 100, reason: 'initial' }]);
});

test('seedCatalog never overwrites owner edits', async () => {
  await seedCatalog(t.db);
  await t.db.update(products).set({ nameEn: 'Renamed by owner' });
  await seedCatalog(t.db);
  expect((await t.db.select().from(products))[0]?.nameEn).toBe('Renamed by owner');
});

test('settings defaults', async () => {
  await seedSettings(t.db);
  await seedSettings(t.db);
  const rows = await t.db.select().from(settings);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    deliveryFeeCents: 0,
    freeDeliveryThresholdCents: null,
    announcementEnabled: true,
    trustpilotUrl: null,
    storeName: 'IBADA',
    social: {},
  });
});

test('order numbers start at 1001', async () => {
  const r = await t.db.execute<{ n: string }>(sql`select nextval('order_number_seq') as n`);
  expect(Number(r.rows[0]?.n)).toBe(1001);
});

test('every public table has RLS enabled', async () => {
  const r = await t.db.execute<{ relname: string }>(sql`
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
  expect(r.rows).toEqual([]);
  const count = await t.db.execute<{ n: string }>(sql`
    select count(*) as n from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'`);
  expect(Number(count.rows[0]?.n)).toBeGreaterThanOrEqual(22);
});
