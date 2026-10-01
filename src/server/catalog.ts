import { and, asc, eq, inArray } from 'drizzle-orm';
import { MAX_LINE_QUANTITY, type CartLine, type L10n } from '@/lib/cart-schema';
import { perUnitCents, savePercent } from '@/lib/money';
import type { Db } from './db/client';
import { bundles, productImages, products } from './db/schema';

export type BundleBadge = 'none' | 'most_popular' | 'best_value';

export type BundleView = {
  id: string;
  name: L10n;
  subtitle: L10n;
  units: number;
  priceCents: number;
  compareAtCents: number | null;
  badge: BundleBadge;
  imageUrl: string | null;
  isDefault: boolean;
  savePercent: number | null;
  perUnitCents: number;
};

/** `urlAr`: Arabic version of a photo with text in it (null = use `url`). */
export type ImageView = { id: string; url: string; urlAr: string | null; alt: L10n; width: number; height: number };

export type ProductView = {
  id: string;
  slug: string;
  name: L10n;
  tagline: L10n;
  description: L10n;
  seoTitle: L10n;
  seoDescription: L10n;
  images: ImageView[];
  bundles: BundleView[];
  stockUnits: number;
  inStock: boolean;
};

export type QuotedLine = {
  bundleId: string;
  productId: string;
  productName: L10n;
  bundleName: L10n;
  units: number;
  quantity: number;
  unitPriceCents: number;
  compareAtCents: number | null;
  lineTotalCents: number;
  imageUrl: string | null;
};

/** "Upgrade & save": swap a cart line for the next pack up of the same product. */
export type UpgradeSuggestion = {
  fromBundleId: string;
  toBundleId: string;
  fromName: L10n;
  toName: L10n;
  toUnits: number;
  extraCents: number;
  fromPerUnitCents: number;
  toPerUnitCents: number;
  imageUrl: string | null;
};

export type CartQuote = { lines: QuotedLine[]; removed: string[]; subtotalCents: number };

type ProductRow = typeof products.$inferSelect;

async function buildViews(db: Db, rows: ProductRow[]): Promise<ProductView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [imgs, bs] = await Promise.all([
    db.select().from(productImages).where(inArray(productImages.productId, ids)).orderBy(asc(productImages.position)),
    db
      .select()
      .from(bundles)
      .where(and(inArray(bundles.productId, ids), eq(bundles.active, true)))
      .orderBy(asc(bundles.position)),
  ]);
  const imageUrl = new Map(imgs.map((i) => [i.id, i.url]));

  return rows.map((p) => {
    const productBundles = bs.filter((b) => b.productId === p.id);
    const minUnits = Math.min(...productBundles.map((b) => b.units));
    return {
      id: p.id,
      slug: p.slug,
      name: { en: p.nameEn, ar: p.nameAr },
      tagline: { en: p.taglineEn, ar: p.taglineAr },
      description: { en: p.descriptionEn, ar: p.descriptionAr },
      seoTitle: { en: p.seoTitleEn, ar: p.seoTitleAr },
      seoDescription: { en: p.seoDescriptionEn, ar: p.seoDescriptionAr },
      images: imgs
        .filter((i) => i.productId === p.id)
        .map((i) => ({
          id: i.id,
          url: i.url,
          urlAr: i.urlAr,
          alt: { en: i.altEn, ar: i.altAr },
          width: i.width,
          height: i.height,
        })),
      bundles: productBundles.map((b) => ({
        id: b.id,
        name: { en: b.nameEn, ar: b.nameAr },
        subtitle: { en: b.subtitleEn, ar: b.subtitleAr },
        units: b.units,
        priceCents: b.priceCents,
        compareAtCents: b.compareAtCents,
        badge: b.badge,
        imageUrl: b.imageId ? (imageUrl.get(b.imageId) ?? null) : null,
        isDefault: b.isDefault,
        savePercent: savePercent(b.priceCents, b.compareAtCents),
        perUnitCents: perUnitCents(b.priceCents, b.units),
      })),
      stockUnits: p.stockUnits,
      inStock: productBundles.length > 0 && p.stockUnits >= minUnits,
    };
  });
}

/** First active product by sort order — the one the home page sells. */
export async function getFeaturedProduct(db: Db): Promise<ProductView | null> {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.status, 'active'))
    .orderBy(asc(products.sortOrder), asc(products.createdAt))
    .limit(1);
  return (await buildViews(db, rows))[0] ?? null;
}

export async function getProductBySlug(db: Db, slug: string): Promise<ProductView | null> {
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.status, 'active')))
    .limit(1);
  return (await buildViews(db, rows))[0] ?? null;
}

export async function listActiveProducts(db: Db): Promise<ProductView[]> {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.status, 'active'))
    .orderBy(asc(products.sortOrder), asc(products.createdAt));
  return buildViews(db, rows);
}

/**
 * Price a cart from the database. Duplicate lines are merged and clamped to 1–10.
 * Lines whose bundle is unknown/inactive, whose product is not active, or that no
 * longer fit in stock are returned in `removed` instead of being priced.
 */
export async function quoteCart(
  db: Db,
  lines: CartLine[],
  opts: { checkStock?: boolean } = {},
): Promise<CartQuote> {
  const checkStock = opts.checkStock ?? true;
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.bundleId, (merged.get(l.bundleId) ?? 0) + l.quantity);
  const ids = [...merged.keys()];
  if (ids.length === 0) return { lines: [], removed: [], subtotalCents: 0 };

  const rows = await db
    .select({ bundle: bundles, product: products, imageUrl: productImages.url })
    .from(bundles)
    .innerJoin(products, eq(products.id, bundles.productId))
    .leftJoin(productImages, eq(productImages.id, bundles.imageId))
    .where(inArray(bundles.id, ids));
  const byId = new Map(rows.map((r) => [r.bundle.id, r]));

  const quoted: QuotedLine[] = [];
  const removed: string[] = [];
  const unitsUsed = new Map<string, number>();

  for (const [bundleId, rawQty] of merged) {
    const row = byId.get(bundleId);
    if (!row || !row.bundle.active || row.product.status !== 'active') {
      removed.push(bundleId);
      continue;
    }
    const quantity = Math.min(Math.max(rawQty, 1), MAX_LINE_QUANTITY);
    const units = row.bundle.units * quantity;
    const used = unitsUsed.get(row.product.id) ?? 0;
    if (checkStock && used + units > row.product.stockUnits) {
      removed.push(bundleId);
      continue;
    }
    unitsUsed.set(row.product.id, used + units);
    quoted.push({
      bundleId,
      productId: row.product.id,
      productName: { en: row.product.nameEn, ar: row.product.nameAr },
      bundleName: { en: row.bundle.nameEn, ar: row.bundle.nameAr },
      units: row.bundle.units,
      quantity,
      unitPriceCents: row.bundle.priceCents,
      compareAtCents: row.bundle.compareAtCents,
      lineTotalCents: row.bundle.priceCents * quantity,
      imageUrl: row.imageUrl ?? null,
    });
  }

  return { lines: quoted, removed, subtotalCents: quoted.reduce((sum, l) => sum + l.lineTotalCents, 0) };
}

/**
 * The first single-quantity cart line that has a bigger active pack of the same product with a
 * lower price per device: suggest swapping it for that next pack up. Null when nothing qualifies.
 */
export async function suggestUpgrade(db: Db, lines: QuotedLine[]): Promise<UpgradeSuggestion | null> {
  const candidates = lines.filter((l) => l.quantity === 1);
  if (candidates.length === 0) return null;
  const productIds = [...new Set(candidates.map((l) => l.productId))];
  const rows = await db
    .select({ bundle: bundles, imageUrl: productImages.url })
    .from(bundles)
    .leftJoin(productImages, eq(productImages.id, bundles.imageId))
    .where(and(inArray(bundles.productId, productIds), eq(bundles.active, true)))
    .orderBy(asc(bundles.units), asc(bundles.position));
  const inCart = new Set(lines.map((l) => l.bundleId));

  for (const line of candidates) {
    const next = rows.find((r) => r.bundle.productId === line.productId && r.bundle.units > line.units);
    if (!next || inCart.has(next.bundle.id)) continue;
    const fromPerUnitCents = perUnitCents(line.unitPriceCents, line.units);
    const toPerUnitCents = perUnitCents(next.bundle.priceCents, next.bundle.units);
    if (toPerUnitCents >= fromPerUnitCents) continue;
    return {
      fromBundleId: line.bundleId,
      toBundleId: next.bundle.id,
      fromName: line.bundleName,
      toName: { en: next.bundle.nameEn, ar: next.bundle.nameAr },
      toUnits: next.bundle.units,
      extraCents: next.bundle.priceCents - line.unitPriceCents,
      fromPerUnitCents,
      toPerUnitCents,
      imageUrl: next.imageUrl ?? null,
    };
  }
  return null;
}
