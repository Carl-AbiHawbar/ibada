'use server';

import { revalidatePath } from 'next/cache';
import { audit } from '@/server/audit';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { invalidate, TAGS } from '@/server/next/cache';
import { requestIp } from '@/server/next/request';
import { updateSettings } from '@/server/settings';

export type SettingsFormValues = {
  storeName: string;
  contactPhone: string;
  contactEmail: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  announcementEn: string;
  announcementAr: string;
  announcementEnabled: boolean;
  deliveryFee: string; // USD
  freeDeliveryThreshold: string; // USD, optional
  deliveryTimeEn: string;
  deliveryTimeAr: string;
  trustpilotUrl: string;
};

const cents = (v: string) => Math.round(Number(v || 0) * 100);

export async function saveSettingsAction(v: SettingsFormValues): Promise<{ ok: true } | { ok: false; fieldErrors: Record<string, string> }> {
  const { user } = await requireAdmin('settings');
  const r = await updateSettings(getDb(), {
    storeName: v.storeName,
    contactPhone: v.contactPhone,
    contactEmail: v.contactEmail,
    social: { instagram: v.instagram, facebook: v.facebook, tiktok: v.tiktok },
    announcementEn: v.announcementEn,
    announcementAr: v.announcementAr,
    announcementEnabled: Boolean(v.announcementEnabled),
    deliveryFeeCents: cents(v.deliveryFee),
    freeDeliveryThresholdCents: String(v.freeDeliveryThreshold).trim() === '' ? null : cents(v.freeDeliveryThreshold),
    deliveryTimeEn: v.deliveryTimeEn,
    deliveryTimeAr: v.deliveryTimeAr,
    trustpilotUrl: v.trustpilotUrl,
  });
  if (!r.ok) {
    const map: Record<string, string> = {
      deliveryFeeCents: 'deliveryFee',
      freeDeliveryThresholdCents: 'freeDeliveryThreshold',
      'social.instagram': 'instagram',
      'social.facebook': 'facebook',
      'social.tiktok': 'tiktok',
    };
    return { ok: false, fieldErrors: Object.fromEntries(Object.entries(r.fieldErrors).map(([k, m]) => [map[k] ?? k, m])) };
  }
  await audit(getDb(), { userId: user.id, action: 'settings.updated', entity: 'settings', summary: 'Updated store settings', ip: await requestIp() });
  // Settings feed the header, footer, product page (delivery) and checkout.
  invalidate(TAGS.settings, TAGS.catalog);
  revalidatePath('/admin/settings');
  return { ok: true };
}
