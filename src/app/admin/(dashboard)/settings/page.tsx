import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { SettingsForm } from '@/components/admin/settings-form';
import { formatLebanesePhone } from '@/lib/phone';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { getSettings } from '@/server/settings';

export const metadata: Metadata = { title: 'Settings' };

const dollars = (c: number | null) => (c === null ? '' : String(c / 100));

export default async function SettingsPage() {
  await requireAdmin('settings');
  const s = await getSettings(getDb());
  return (
    <>
      <PageHeader title="Settings" description="Changes appear on the shop right away." />
      <SettingsForm
        initial={{
          storeName: s.storeName,
          contactPhone: s.contactPhone ? (s.contactPhone.length <= 12 ? formatLebanesePhone(s.contactPhone) : s.contactPhone) : '',
          contactEmail: s.contactEmail ?? '',
          instagram: s.social.instagram ?? '',
          facebook: s.social.facebook ?? '',
          tiktok: s.social.tiktok ?? '',
          announcementEn: s.announcement.en,
          announcementAr: s.announcement.ar,
          announcementEnabled: s.announcementEnabled,
          deliveryFee: dollars(s.deliveryFeeCents),
          freeDeliveryThreshold: dollars(s.freeDeliveryThresholdCents),
          deliveryTimeEn: s.deliveryTime.en,
          deliveryTimeAr: s.deliveryTime.ar,
          trustpilotUrl: s.trustpilotUrl ?? '',
        }}
      />
    </>
  );
}
