import { Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

const TRUSTPILOT_GREEN = '#00B67A';

/**
 * Shown above the gallery while the shop has no reviews: an invitation to review the shop on Trustpilot.
 * It never shows a score; the rating badge takes its place once real reviews exist.
 */
export async function TrustpilotInvite({ locale, domain, profileUrl }: { locale: Locale; domain: string; profileUrl: string | null }) {
  const t = await getTranslations({ locale, namespace: 'hero' });
  return (
    <a
      data-testid="trustpilot-invite"
      href={profileUrl ?? `https://www.trustpilot.com/evaluate/${domain}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-4 inline-flex items-center gap-2.5 rounded-2xl bg-navy px-4 py-3 text-white shadow-[0_14px_34px_-18px_rgba(1,39,85,0.7)] transition hover:bg-navy-700"
    >
      <span className="flex size-7 items-center justify-center rounded-[5px]" style={{ background: TRUSTPILOT_GREEN }} aria-hidden>
        <Star className="size-[18px] fill-white text-white" />
      </span>
      <span className="text-sm text-white/85">
        {t('reviewUsOn')} <span className="text-base font-extrabold text-white">Trustpilot</span>
      </span>
    </a>
  );
}
