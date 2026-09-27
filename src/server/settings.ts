import type { L10n } from '@/lib/cart-schema';
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
