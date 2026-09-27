import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db/client';
import { bundles, inventoryMovements, productImages, products, user } from '../db/schema';

const text = (max: number) => z.string().trim().max(max);

export const productInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,60}$/, 'Use 2–60 lowercase letters, numbers or dashes'),
  nameEn: text(80).min(2, 'Required'),
  nameAr: text(80).min(2, 'Required'),
  taglineEn: text(160),
  taglineAr: text(160),
  descriptionEn: text(4000),
  descriptionAr: text(4000),
  seoTitleEn: text(70),
  seoTitleAr: text(70),
  seoDescriptionEn: text(160),
  seoDescriptionAr: text(160),
  status: z.enum(['active', 'draft']),
  lowStockThreshold: z.coerce.number().int().min(0).max(10_000),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const bundleInputSchema = z
  .object({
    nameEn: text(60).min(2, 'Required'),
    nameAr: text(60).min(2, 'Required'),
    subtitleEn: text(80),
    subtitleAr: text(80),
    units: z.coerce.number().int().min(1).max(20),
    priceCents: z.coerce.number().int().min(1, 'Price must be above 0').max(1_000_000),
    compareAtCents: z.coerce.number().int().min(1).max(1_000_000).nullable(),
    badge: z.enum(['none', 'most_popular', 'best_value']),
    imageId: z.uuid().nullable(),
    active: z.boolean(),
  })
  .refine((b) => b.compareAtCents === null || b.compareAtCents > b.priceCents, {
    path: ['compareAtCents'],
    message: 'The "was" price must be higher than the price',
  });
export type BundleInput = z.infer<typeof bundleInputSchema>;

type Fail<E extends string> = { ok: false; error: E; fieldErrors?: Record<string, string> };
const fieldErrors = (e: z.ZodError) =>
  Object.fromEntries(e.issues.map((i) => [String(i.path[0] ?? 'form'), i.message])) as Record<string, string>;
const isUniqueViolation = (err: unknown) => {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === '23505' || e?.cause?.code === '23505';
};

export async function saveProduct(
  db: Db,
  a: { id?: string; input: unknown; userId: string },
): Promise<{ ok: true; id: string } | Fail<'invalid' | 'slug_taken' | 'not_found'>> {
  const parsed = productInputSchema.safeParse(a.input);
  if (!parsed.success) return { ok: false, error: 'invalid', fieldErrors: fieldErrors(parsed.error) };
  try {
    if (a.id) {
      const [row] = await db.update(products).set(parsed.data).where(eq(products.id, a.id)).returning({ id: products.id });
      return row ? { ok: true, id: row.id } : { ok: false, error: 'not_found' };
    }
    const [row] = await db.insert(products).values({ ...parsed.data, stockUnits: 0 }).returning({ id: products.id });
    return { ok: true, id: row!.id };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: 'slug_taken', fieldErrors: { slug: 'This address is already used' } };
    throw err;
  }
}

export async function saveBundle(
  db: Db,
  a: { productId: string; id?: string; input: unknown },
): Promise<{ ok: true; id: string } | Fail<'invalid' | 'not_found'>> {
  const parsed = bundleInputSchema.safeParse(a.input);
  if (!parsed.success) return { ok: false, error: 'invalid', fieldErrors: fieldErrors(parsed.error) };
  if (parsed.data.imageId) {
    const [img] = await db
      .select({ id: productImages.id })
      .from(productImages)
      .where(and(eq(productImages.id, parsed.data.imageId), eq(productImages.productId, a.productId)));
    if (!img) return { ok: false, error: 'invalid', fieldErrors: { imageId: 'Pick one of this product’s photos' } };
  }
  if (a.id) {
    const [row] = await db
      .update(bundles)
      .set(parsed.data)
      .where(and(eq(bundles.id, a.id), eq(bundles.productId, a.productId)))
      .returning({ id: bundles.id });
    return row ? { ok: true, id: row.id } : { ok: false, error: 'not_found' };
  }
  const [{ n }] = (await db.select({ n: count() }).from(bundles).where(eq(bundles.productId, a.productId))) as [{ n: number }];
  const [row] = await db
    .insert(bundles)
    .values({ ...parsed.data, productId: a.productId, position: n, isDefault: n === 0 })
    .returning({ id: bundles.id });
  return { ok: true, id: row!.id };
}

export async function setDefaultBundle(db: Db, productId: string, bundleId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(bundles).set({ isDefault: false }).where(eq(bundles.productId, productId));
    await tx.update(bundles).set({ isDefault: true }).where(and(eq(bundles.id, bundleId), eq(bundles.productId, productId)));
  });
}

async function reorder(db: Db, table: typeof bundles | typeof productImages, productId: string, ids: string[]) {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      await tx
        .update(table)
        .set({ position: i })
        .where(and(eq(table.id, id), eq(table.productId, productId)));
    }
  });
}

export const reorderBundles = (db: Db, productId: string, ids: string[]) => reorder(db, bundles, productId, ids);
export const reorderImages = (db: Db, productId: string, ids: string[]) => reorder(db, productImages, productId, ids);

export async function addImage(
  db: Db,
  a: { productId: string; url: string; width: number; height: number; altEn?: string; altAr?: string },
): Promise<{ id: string }> {
  const [{ n }] = (await db.select({ n: count() }).from(productImages).where(eq(productImages.productId, a.productId))) as [
    { n: number },
  ];
  const [row] = await db
    .insert(productImages)
    .values({ ...a, altEn: a.altEn ?? '', altAr: a.altAr ?? '', position: n })
    .returning({ id: productImages.id });
  return { id: row!.id };
}

export async function updateImageAlt(db: Db, a: { imageId: string; altEn: string; altAr: string }): Promise<void> {
  await db
    .update(productImages)
    .set({ altEn: a.altEn.trim().slice(0, 160), altAr: a.altAr.trim().slice(0, 160) })
    .where(eq(productImages.id, a.imageId));
}

/** Delete an image row (bundles using it fall back to no image); returns its URL for storage cleanup. */
export async function deleteImage(db: Db, imageId: string): Promise<{ url: string } | null> {
  const [row] = await db.delete(productImages).where(eq(productImages.id, imageId)).returning({ url: productImages.url });
  return row ?? null;
}

export async function adjustStock(
  db: Db,
  a: { productId: string; delta: number; note: string; userId: string },
): Promise<{ ok: true; stockUnits: number; stockCrossedZero: boolean } | { ok: false; error: 'note_required' | 'negative_stock' | 'not_found' }> {
  const note = a.note.trim().slice(0, 300);
  if (!note) return { ok: false, error: 'note_required' };
  if (!Number.isInteger(a.delta) || a.delta === 0 || Math.abs(a.delta) > 100_000) return { ok: false, error: 'negative_stock' };
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(products)
      .set({ stockUnits: sql`${products.stockUnits} + ${a.delta}` })
      .where(and(eq(products.id, a.productId), sql`${products.stockUnits} + ${a.delta} >= 0`))
      .returning({ stockUnits: products.stockUnits });
    if (!row) {
      const [exists] = await tx.select({ id: products.id }).from(products).where(eq(products.id, a.productId));
      return { ok: false as const, error: exists ? ('negative_stock' as const) : ('not_found' as const) };
    }
    await tx.insert(inventoryMovements).values({ productId: a.productId, deltaUnits: a.delta, reason: 'manual', note, userId: a.userId });
    const before = row.stockUnits - a.delta;
    return { ok: true as const, stockUnits: row.stockUnits, stockCrossedZero: (before === 0) !== (row.stockUnits === 0) };
  });
}

export async function listMovements(db: Db, productId: string, page: number) {
  const size = 30;
  const rows = await db
    .select({
      id: inventoryMovements.id,
      deltaUnits: inventoryMovements.deltaUnits,
      reason: inventoryMovements.reason,
      note: inventoryMovements.note,
      orderId: inventoryMovements.orderId,
      createdAt: inventoryMovements.createdAt,
      actorName: user.name,
    })
    .from(inventoryMovements)
    .leftJoin(user, eq(user.id, inventoryMovements.userId))
    .where(eq(inventoryMovements.productId, productId))
    .orderBy(desc(inventoryMovements.createdAt), desc(inventoryMovements.id))
    .limit(size)
    .offset((Math.max(1, page) - 1) * size);
  return { rows };
}

export async function listProductsAdmin(db: Db) {
  const rows = await db.select().from(products).orderBy(asc(products.sortOrder), asc(products.createdAt));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [bundleCounts, images] = await Promise.all([
    db.select({ productId: bundles.productId, n: count() }).from(bundles).where(inArray(bundles.productId, ids)).groupBy(bundles.productId),
    db.select().from(productImages).where(inArray(productImages.productId, ids)).orderBy(asc(productImages.position)),
  ]);
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    nameEn: p.nameEn,
    status: p.status,
    stockUnits: p.stockUnits,
    lowStockThreshold: p.lowStockThreshold,
    bundleCount: bundleCounts.find((b) => b.productId === p.id)?.n ?? 0,
    imageUrl: images.find((i) => i.productId === p.id)?.url ?? null,
  }));
}

export async function getProductAdmin(db: Db, id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) return null;
  const [images, bundleRows] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.position)),
    db.select().from(bundles).where(eq(bundles.productId, id)).orderBy(asc(bundles.position)),
  ]);
  return { product, images, bundles: bundleRows };
}
