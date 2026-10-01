import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../helpers/db';
import { seeded } from '../helpers/fixtures';
import { insertStaff } from '../helpers/orders';
import { bundles, inventoryMovements, productImages, products } from '@/server/db/schema';
import {
  addImage,
  adjustStock,
  bundleInputSchema,
  deleteImage,
  getProductAdmin,
  listMovements,
  listProductsAdmin,
  reorderBundles,
  reorderImages,
  saveBundle,
  saveProduct,
  setDefaultBundle,
} from '@/server/admin/products';
import type { SeededCatalog } from '@/server/db/seed';

let t: TestDb;
let s: SeededCatalog;
let userId: string;
beforeEach(async () => {
  t = await createTestDb();
  s = await seeded(t.db);
  userId = await insertStaff(t.db);
});
afterEach(() => t.close());

const productInput = {
  slug: 'ibada-two',
  nameEn: 'IBADA TWO',
  nameAr: 'IBADA TWO',
  taglineEn: 'Stronger.',
  taglineAr: 'أقوى.',
  descriptionEn: '',
  descriptionAr: '',
  seoTitleEn: '',
  seoTitleAr: '',
  seoDescriptionEn: '',
  seoDescriptionAr: '',
  status: 'draft',
  lowStockThreshold: 5,
};
const bundleInput = {
  nameEn: 'Solo',
  nameAr: 'منفرد',
  subtitleEn: 'Up to 50m² coverage',
  subtitleAr: 'تغطية حتى 50 م²',
  units: 1,
  priceCents: 2500,
  compareAtCents: 3500,
  badge: 'none',
  imageId: null,
  active: true,
};

describe('validation', () => {
  it('compare-at must be above the price', () => {
    expect(bundleInputSchema.safeParse({ ...bundleInput, compareAtCents: 2500 }).success).toBe(false);
    expect(bundleInputSchema.safeParse({ ...bundleInput, compareAtCents: 1000 }).success).toBe(false);
    expect(bundleInputSchema.safeParse({ ...bundleInput, compareAtCents: null }).success).toBe(true);
  });
  it('units and price must be positive', () => {
    expect(bundleInputSchema.safeParse({ ...bundleInput, units: 0 }).success).toBe(false);
    expect(bundleInputSchema.safeParse({ ...bundleInput, priceCents: 0 }).success).toBe(false);
  });
});

describe('products', () => {
  it('creates and edits products with unique slugs', async () => {
    const r = await saveProduct(t.db, { input: productInput, userId });
    expect(r).toMatchObject({ ok: true });
    expect(await saveProduct(t.db, { input: { ...productInput, slug: 'ibada-one' }, userId })).toMatchObject({
      ok: false,
      error: 'slug_taken',
    });
    expect(await saveProduct(t.db, { input: { ...productInput, slug: 'Bad Slug!' }, userId })).toMatchObject({
      ok: false,
      error: 'invalid',
      fieldErrors: { slug: expect.any(String) },
    });
    const edited = await saveProduct(t.db, { id: s.productId, input: { ...productInput, slug: 'ibada-one', nameEn: 'IBADA ONE+' }, userId });
    expect(edited).toEqual({ ok: true, id: s.productId });
    expect((await getProductAdmin(t.db, s.productId))!.product.nameEn).toBe('IBADA ONE+');
  });

  it('lists products with stock and bundle counts', async () => {
    expect(await listProductsAdmin(t.db)).toMatchObject([
      { id: s.productId, nameEn: 'IBADA ONE', status: 'active', stockUnits: 100, bundleCount: 4, imageUrl: '/images/products/ibada-one-single.webp' },
    ]);
  });
});

describe('bundles', () => {
  it('adds, edits, reorders and keeps a single default', async () => {
    const created = await saveBundle(t.db, { productId: s.productId, input: bundleInput });
    expect(created).toMatchObject({ ok: true });
    await saveBundle(t.db, { productId: s.productId, id: s.bundleIds.single, input: { ...bundleInput, nameEn: 'Single Room Protection', priceCents: 2200, compareAtCents: 3000 } });
    const [single] = await t.db.select().from(bundles).where(eq(bundles.id, s.bundleIds.single));
    expect(single).toMatchObject({ priceCents: 2200, nameEn: 'Single Room Protection' });

    await setDefaultBundle(t.db, s.productId, s.bundleIds.full);
    expect((await t.db.select().from(bundles).where(eq(bundles.isDefault, true))).map((b) => b.id)).toEqual([s.bundleIds.full]);

    await reorderBundles(t.db, s.productId, [s.bundleIds.full, s.bundleIds.triple, s.bundleIds.double, s.bundleIds.single]);
    const order = (await getProductAdmin(t.db, s.productId))!.bundles.map((b) => b.id);
    expect(order.slice(0, 4)).toEqual([s.bundleIds.full, s.bundleIds.triple, s.bundleIds.double, s.bundleIds.single]);
  });

  it('refuses bundles for another product', async () => {
    const other = await saveProduct(t.db, { input: productInput, userId });
    if (!other.ok) throw new Error('setup');
    expect(await saveBundle(t.db, { productId: other.id, id: s.bundleIds.single, input: bundleInput })).toMatchObject({
      ok: false,
      error: 'not_found',
    });
  });
});

describe('images', () => {
  it('adds, reorders and deletes images, unlinking bundles', async () => {
    const { id } = await addImage(t.db, { productId: s.productId, url: '/uploads/products/x.webp', width: 10, height: 10 });
    const imgs = await t.db.select().from(productImages).where(eq(productImages.productId, s.productId));
    expect(imgs).toHaveLength(10); // 9 seeded + the new one
    await reorderImages(t.db, s.productId, [id, ...imgs.filter((i) => i.id !== id).map((i) => i.id)]);
    expect((await getProductAdmin(t.db, s.productId))!.images[0]!.id).toBe(id);

    const [single] = await t.db.select().from(bundles).where(eq(bundles.id, s.bundleIds.single));
    expect(await deleteImage(t.db, single!.imageId!)).toEqual({ url: '/images/products/ibada-one-single.webp' });
    const [after] = await t.db.select().from(bundles).where(eq(bundles.id, s.bundleIds.single));
    expect(after!.imageId).toBeNull();
  });
});

describe('stock', () => {
  it('needs a note, never goes negative, and logs movements', async () => {
    expect(await adjustStock(t.db, { productId: s.productId, delta: 10, note: '  ', userId })).toEqual({ ok: false, error: 'note_required' });
    expect(await adjustStock(t.db, { productId: s.productId, delta: -1000, note: 'count', userId })).toEqual({ ok: false, error: 'negative_stock' });
    expect(await adjustStock(t.db, { productId: s.productId, delta: 10, note: 'New shipment', userId })).toEqual({
      ok: true,
      stockUnits: 110,
      stockCrossedZero: false,
    });
    expect(await adjustStock(t.db, { productId: s.productId, delta: -110, note: 'recount', userId })).toEqual({
      ok: true,
      stockUnits: 0,
      stockCrossedZero: true,
    });
    expect(await adjustStock(t.db, { productId: s.productId, delta: 5, note: 'found', userId })).toMatchObject({ stockCrossedZero: true });
    expect((await t.db.select().from(products))[0]!.stockUnits).toBe(5);
    const moves = await listMovements(t.db, s.productId, 1);
    expect(moves.rows.slice(0, 2)).toMatchObject([
      { deltaUnits: 5, reason: 'manual', note: 'found', actorName: 'Owner' },
      { deltaUnits: -110, reason: 'manual', note: 'recount' },
    ]);
    expect(await t.db.select().from(inventoryMovements).where(eq(inventoryMovements.reason, 'manual'))).toHaveLength(3);
  });
});
