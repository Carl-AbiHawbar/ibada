CREATE TABLE "delivery_signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_signups_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "delivery_signups_created_idx" ON "delivery_signups" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "delivery_signups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Free delivery becomes an offer: stores still on the original free-for-all settings get a $3 fee
-- and an announcement that points to the offer. Stores that changed either keep their values.
UPDATE "settings" SET "delivery_fee_cents" = 300 WHERE "delivery_fee_cents" = 0;--> statement-breakpoint
UPDATE "settings" SET
  "announcement_en" = 'Free delivery when you sign up · Cash on delivery · 60-day money-back guarantee',
  "announcement_ar" = 'توصيل مجاني عند التسجيل · الدفع عند الاستلام · ضمان استرداد المال لمدة 60 يومًا'
WHERE "announcement_en" = 'Free delivery · Cash on delivery · 60-day money-back guarantee';
