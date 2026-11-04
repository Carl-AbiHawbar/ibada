-- A fresh database got the seed's $0 fee: migrations 0003/0004 raised the fee only on rows that already existed.
-- Give a store still at $0 the $4 delivery fee the free-delivery offer is built around.
UPDATE "settings" SET "delivery_fee_cents" = 400 WHERE "delivery_fee_cents" = 0;--> statement-breakpoint
-- Client request (2026-11-04): the money-back guarantee is 30 days, not 60. Only the stock wording changes.
UPDATE "settings"
SET "announcement_en" = replace("announcement_en", '60-day money-back guarantee', '30-day money-back guarantee'),
    "announcement_ar" = replace("announcement_ar", 'لمدة 60 يومًا', 'لمدة 30 يومًا')
WHERE "announcement_en" LIKE '%60-day money-back guarantee%' OR "announcement_ar" LIKE '%لمدة 60 يومًا%';
