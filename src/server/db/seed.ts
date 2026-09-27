import path from 'node:path';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import type { Db } from './client';
import { bundles, inventoryMovements, productImages, products, settings } from './schema';

const PRODUCT_SLUG = 'ibada-one';
const INITIAL_STOCK_UNITS = 100;

const DESCRIPTION_EN = [
  'IBADA uses ultrasonic technology to help repel unwanted pests — silently, safely, and without a single spray. Simply plug it in and let it work around the clock, covering up to 50m² per unit. Free of chemicals, sprays, and toxins — just a calmer, more comfortable home.',
  "How it works: IBADA emits high-frequency sound waves, inaudible to people, that disrupt pests' nervous systems and drive them away from your space over time.",
  'Specifications: 220V · Indoor use · Plug-and-protect, no setup required',
].join('\n\n');

const DESCRIPTION_AR = [
  'يستخدم IBADA تقنية الموجات فوق الصوتية للمساعدة في إبعاد الحشرات والقوارض غير المرغوب فيها — بصمت وأمان ومن دون أي رذاذ. ما عليك سوى توصيله بالكهرباء ليعمل على مدار الساعة، مع تغطية تصل إلى 50 م² لكل جهاز. خالٍ من المواد الكيميائية والرذاذ والسموم — فقط منزل أكثر هدوءًا وراحة.',
  'كيف يعمل: يُصدر IBADA موجات صوتية عالية التردد لا يسمعها الإنسان، تُربك الجهاز العصبي للحشرات والقوارض وتُبعدها عن منزلك تدريجيًا.',
  'المواصفات: 220 فولت · للاستخدام الداخلي · وصّله واحمِ منزلك، من دون أي إعداد',
].join('\n\n');

const IMAGES = [
  { file: 'single', altEn: 'IBADA ONE ultrasonic pest repeller — single device', altAr: 'جهاز IBADA ONE لطرد الحشرات — جهاز واحد' },
  { file: 'double', altEn: 'IBADA ONE ultrasonic pest repeller — pack of 2', altAr: 'جهاز IBADA ONE لطرد الحشرات — عبوة من جهازين' },
  { file: 'triple', altEn: 'IBADA ONE ultrasonic pest repeller — pack of 3', altAr: 'جهاز IBADA ONE لطرد الحشرات — عبوة من 3 أجهزة' },
  { file: 'full', altEn: 'IBADA ONE ultrasonic pest repeller — pack of 4', altAr: 'جهاز IBADA ONE لطرد الحشرات — عبوة من 4 أجهزة' },
] as const;

const BUNDLES = [
  { key: 'single', nameEn: 'Single Room Protection', nameAr: 'حماية غرفة واحدة', units: 1, m2: 50, price: 2000, compareAt: 3000, badge: 'none' },
  { key: 'double', nameEn: 'Multi-Room Protection', nameAr: 'حماية عدة غرف', units: 2, m2: 100, price: 3600, compareAt: 6000, badge: 'most_popular' },
  { key: 'triple', nameEn: 'Family Pack', nameAr: 'باقة العائلة', units: 3, m2: 150, price: 5100, compareAt: 9000, badge: 'none' },
  { key: 'full', nameEn: 'Full Home Protection', nameAr: 'حماية المنزل بالكامل', units: 4, m2: 200, price: 6000, compareAt: 12000, badge: 'best_value' },
] as const;

type BundleKey = (typeof BUNDLES)[number]['key'];
export type SeededCatalog = { productId: string; bundleIds: Record<BundleKey, string> };

/** Insert the single settings row if it does not exist yet. */
export async function seedSettings(db: Db): Promise<void> {
  await db
    .insert(settings)
    .values({
      storeName: 'IBADA',
      announcementEn: 'Free delivery · Cash on delivery · 60-day money-back guarantee',
      announcementAr: 'توصيل مجاني · الدفع عند الاستلام · ضمان استرداد المال لمدة 60 يومًا',
      announcementEnabled: true,
      deliveryFeeCents: 0,
      deliveryTimeEn: 'Orders are typically delivered in 2–4 business days',
      deliveryTimeAr: 'يتم توصيل الطلبات عادةً خلال 2–4 أيام عمل',
    })
    .onConflictDoNothing({ target: settings.singleton });
}

async function imageSize(file: string): Promise<{ width: number; height: number }> {
  const meta = await sharp(path.resolve(process.cwd(), 'public/images/products', `ibada-one-${file}.webp`)).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}

/** Insert the IBADA ONE product with its 4 bundles once; never overwrites owner edits. */
export async function seedCatalog(db: Db): Promise<SeededCatalog> {
  const existing = await db.query.products.findFirst({ where: eq(products.slug, PRODUCT_SLUG) });
  if (existing) {
    const rows = await db.select().from(bundles).where(eq(bundles.productId, existing.id)).orderBy(bundles.position);
    const bundleIds = Object.fromEntries(BUNDLES.map((b, i) => [b.key, rows[i]?.id ?? ''])) as Record<BundleKey, string>;
    return { productId: existing.id, bundleIds };
  }

  const sizes = await Promise.all(IMAGES.map((img) => imageSize(img.file)));

  return db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        slug: PRODUCT_SLUG,
        nameEn: 'IBADA ONE',
        nameAr: 'IBADA ONE',
        taglineEn: 'Helps repel unwanted pests using ultrasonic technology.',
        taglineAr: 'يساعد على إبعاد الحشرات والقوارض غير المرغوب فيها بتقنية الموجات فوق الصوتية.',
        descriptionEn: DESCRIPTION_EN,
        descriptionAr: DESCRIPTION_AR,
        status: 'active',
        stockUnits: INITIAL_STOCK_UNITS,
        lowStockThreshold: 10,
        seoTitleEn: 'IBADA ONE — Ultrasonic Pest Repeller | Cash on Delivery in Lebanon',
        seoTitleAr: 'IBADA ONE — طارد الحشرات بالموجات فوق الصوتية | الدفع عند الاستلام في لبنان',
        seoDescriptionEn:
          'Chemical-free ultrasonic pest protection for every room. Up to 50m² per device, safe for kids & pets. Delivery all over Lebanon, pay cash on delivery.',
        seoDescriptionAr:
          'حماية من الحشرات والقوارض من دون مواد كيميائية. تغطية حتى 50 م² لكل جهاز، آمن للأطفال والحيوانات الأليفة. توصيل إلى كل لبنان والدفع عند الاستلام.',
        sortOrder: 0,
      })
      .returning({ id: products.id });
    if (!product) throw new Error('seedCatalog: product insert returned nothing');

    const images = await tx
      .insert(productImages)
      .values(
        IMAGES.map((img, i) => ({
          productId: product.id,
          url: `/images/products/ibada-one-${img.file}.webp`,
          altEn: img.altEn,
          altAr: img.altAr,
          width: sizes[i]!.width,
          height: sizes[i]!.height,
          position: i,
        })),
      )
      .returning({ id: productImages.id, position: productImages.position });
    const imageIdAt = (pos: number) => images.find((im) => im.position === pos)?.id ?? null;

    const inserted = await tx
      .insert(bundles)
      .values(
        BUNDLES.map((b, i) => ({
          productId: product.id,
          nameEn: b.nameEn,
          nameAr: b.nameAr,
          subtitleEn: `Up to ${b.m2}m² coverage`,
          subtitleAr: `تغطية حتى ${b.m2} م²`,
          units: b.units,
          priceCents: b.price,
          compareAtCents: b.compareAt,
          badge: b.badge,
          imageId: imageIdAt(i),
          isDefault: b.key === 'double',
          position: i,
        })),
      )
      .returning({ id: bundles.id, position: bundles.position });

    await tx.insert(inventoryMovements).values({
      productId: product.id,
      deltaUnits: INITIAL_STOCK_UNITS,
      reason: 'initial',
      note: 'Initial stock (seed)',
    });

    const bundleIds = Object.fromEntries(
      BUNDLES.map((b, i) => [b.key, inserted.find((row) => row.position === i)!.id]),
    ) as Record<BundleKey, string>;
    return { productId: product.id, bundleIds };
  });
}
