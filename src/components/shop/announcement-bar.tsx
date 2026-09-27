import type { Locale } from '@/i18n/routing';
import { getSettingsCached } from '@/server/next/storefront-data';

export async function AnnouncementBar({ locale }: { locale: Locale }) {
  const s = await getSettingsCached();
  const text = s.announcement[locale];
  if (!s.announcementEnabled || !text) return null;
  return (
    <div className="bg-navy px-4 py-2 text-center text-[13px] font-medium tracking-wide text-white" data-testid="announcement">
      {text}
    </div>
  );
}
