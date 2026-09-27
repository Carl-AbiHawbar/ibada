import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { L10n } from '@/lib/cart-schema';
import { normalizeLebanesePhone } from '@/lib/phone';
import type { Db } from './db/client';
import { settings, type SocialLinks } from './db/schema';
import { seedSettings } from './db/settings-defaults';

export type StoreSettings = {
  storeName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  social: SocialLinks;
  announcement: L10n;
  announcementEnabled: boolean;
  deliveryFeeCents: number;
  freeDeliveryThresholdCents: number | null;
  deliveryTime: L10n;
  trustpilotUrl: string | null;
};

type Row = typeof settings.$inferSelect;

function toView(r: Row): StoreSettings {
  return {
    storeName: r.storeName,
    contactPhone: r.contactPhone,
    contactEmail: r.contactEmail,
    social: r.social,
    announcement: { en: r.announcementEn, ar: r.announcementAr },
    announcementEnabled: r.announcementEnabled,
    deliveryFeeCents: r.deliveryFeeCents,
    freeDeliveryThresholdCents: r.freeDeliveryThresholdCents,
    deliveryTime: { en: r.deliveryTimeEn, ar: r.deliveryTimeAr },
    trustpilotUrl: r.trustpilotUrl,
  };
}

/** The single settings row (created with defaults if it is missing). */
export async function getSettings(db: Db): Promise<StoreSettings> {
  let [row] = await db.select().from(settings).limit(1);
  if (!row) {
    await seedSettings(db);
    [row] = await db.select().from(settings).limit(1);
  }
  if (!row) throw new Error('settings row missing');
  return toView(row);
}

/** Delivery charge for an order whose subtotal (after discount) is given. */
export function deliveryFeeFor(s: StoreSettings, subtotalAfterDiscountCents: number): number {
  if (s.deliveryFeeCents === 0) return 0;
  if (s.freeDeliveryThresholdCents !== null && subtotalAfterDiscountCents >= s.freeDeliveryThresholdCents) return 0;
  return s.deliveryFeeCents;
}

// ---------- admin ----------

const optionalText = (max: number) => z.string().trim().max(max);
const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
const httpsUrl = z.url({ protocol: /^https$/, error: 'Use a full https:// link' }).max(200);

export const settingsInputSchema = z.object({
  storeName: z.string().trim().min(1, 'Required').max(60),
  contactPhone: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(40)
      .transform((v, ctx) => {
        const mobile = normalizeLebanesePhone(v);
        const e164 = v.replace(/[\s-]/g, '');
        if (mobile) return mobile;
        if (/^\+961\d{7,8}$/.test(e164)) return e164; // landline in international format
        ctx.addIssue({ code: 'custom', message: 'Use a Lebanese number, e.g. 03 123 456' });
        return z.NEVER;
      })
      .nullable(),
  ),
  contactEmail: z.preprocess(emptyToNull, z.email('Enter a valid email').max(120).nullable()),
  social: z.object({
    instagram: z.preprocess(emptyToNull, httpsUrl.nullable()),
    facebook: z.preprocess(emptyToNull, httpsUrl.nullable()),
    tiktok: z.preprocess(emptyToNull, httpsUrl.nullable()),
  }),
  announcementEn: optionalText(140),
  announcementAr: optionalText(140),
  announcementEnabled: z.boolean(),
  deliveryFeeCents: z.int().min(0, 'Cannot be negative').max(10_000),
  freeDeliveryThresholdCents: z.int().min(0).max(10_000_000).nullable(),
  deliveryTimeEn: optionalText(120),
  deliveryTimeAr: optionalText(120),
  trustpilotUrl: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .regex(/^https:\/\/(www\.)?trustpilot\.com\/review\/[\w.-]+\/?$/, 'Use your Trustpilot review page link')
      .nullable(),
  ),
});

export async function updateSettings(db: Db, input: unknown): Promise<{ ok: true } | { ok: false; fieldErrors: Record<string, string> }> {
  const parsed = settingsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.') || 'form', i.message])) };
  }
  await getSettings(db); // ensures the row exists
  const { social, ...rest } = parsed.data;
  const cleanSocial = Object.fromEntries(Object.entries(social).filter(([, v]) => v)) as SocialLinks;
  await db.update(settings).set({ ...rest, social: cleanSocial }).where(eq(settings.singleton, true));
  return { ok: true };
}
