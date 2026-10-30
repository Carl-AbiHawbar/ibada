ALTER TABLE "delivery_signups" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
-- The phone now identifies a signup: keep only the newest signup per phone before making it unique.
DELETE FROM "delivery_signups" AS older
USING "delivery_signups" AS newer
WHERE older."phone" = newer."phone"
  AND (older."updated_at", older."id") < (newer."updated_at", newer."id");--> statement-breakpoint
ALTER TABLE "delivery_signups" ADD CONSTRAINT "delivery_signups_phone_unique" UNIQUE("phone");--> statement-breakpoint
-- Client request (2026-10-30): the single device is the pack selected when the page opens.
-- Only for stores still on the original default (the 2-pack); an owner's own choice is kept.
UPDATE "bundles" AS b SET "is_default" = (b."units" = 1)
WHERE b."product_id" IN (SELECT "id" FROM "products" WHERE "slug" = 'ibada-one')
  AND EXISTS (
    SELECT 1 FROM "bundles" AS d
    WHERE d."product_id" = b."product_id" AND d."is_default" AND d."units" = 2
  )
  AND EXISTS (
    SELECT 1 FROM "bundles" AS s
    WHERE s."product_id" = b."product_id" AND s."units" = 1 AND s."active"
  );
