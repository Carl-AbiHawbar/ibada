ALTER TABLE "delivery_signups" ADD COLUMN "pests" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "url_ar" text;--> statement-breakpoint
-- Client refinements (2026-10-01) for stores still on the original values; owner edits are kept.
UPDATE "bundles" AS b SET "price_cents" = v.new_cents
FROM (VALUES (1, 2000, 1999), (2, 3600, 3599), (3, 5100, 5099), (4, 6000, 5999)) AS v(units, old_cents, new_cents)
WHERE b."units" = v.units AND b."price_cents" = v.old_cents
  AND b."product_id" IN (SELECT "id" FROM "products" WHERE "slug" = 'ibada-one');--> statement-breakpoint
UPDATE "settings" SET "delivery_fee_cents" = 400 WHERE "delivery_fee_cents" = 300;--> statement-breakpoint
INSERT INTO "product_images" ("product_id", "url", "url_ar", "alt_en", "alt_ar", "width", "height", "position")
SELECT p."id", v.url, v.url_ar, v.alt_en, v.alt_ar, 1200, 1200, v.pos
FROM "products" AS p,
  (VALUES
    ('/images/products/gallery-box-en.webp', '/images/products/gallery-box-ar.webp', 'The IBADA ONE box: no scent, no insects', 'علبة IBADA ONE: بلا رائحة، بلا حشرات', 4),
    ('/images/products/gallery-how-en.webp', '/images/products/gallery-how-ar.webp', 'How IBADA works silently 24/7 with ultrasonic waves', 'كيف يعمل IBADA بصمت على مدار الساعة بالموجات فوق الصوتية', 5),
    ('/images/products/gallery-family-en.webp', '/images/products/gallery-family-ar.webp', 'Human and pet safe: a family at home with IBADA plugged in', 'آمن للإنسان والحيوان: عائلة في المنزل مع جهاز IBADA', 6),
    ('/images/products/gallery-home-en.webp', '/images/products/gallery-home-ar.webp', '24/7 protection on every floor of the home', 'حماية منزلك على مدار الساعة في كل طابق', 7),
    ('/images/products/gallery-settings-en.webp', '/images/products/gallery-settings-ar.webp', 'For every setting: house, restaurant, café and office', 'مناسب لكل مكان: المنزل والمطعم والمقهى والمكتب', 8)
  ) AS v(url, url_ar, alt_en, alt_ar, pos)
WHERE p."slug" = 'ibada-one'
  AND NOT EXISTS (SELECT 1 FROM "product_images" AS i WHERE i."product_id" = p."id" AND i."url" = v.url);
