import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import type { ReviewSummary } from '@/server/reviews';
import { Stars } from './stars';

export async function RatingSummary({
  locale,
  summary,
  trustpilotUrl,
}: {
  locale: Locale;
  summary: ReviewSummary;
  trustpilotUrl: string | null;
}) {
  if (summary.count === 0) return null;
  const t = await getTranslations({ locale, namespace: 'hero' });
  const content = (
    <>
      <Stars value={summary.average} className="text-lg" />
      <span className="font-bold text-navy">{t('ratingLabel', { average: summary.average.toFixed(1) })}</span>
      <span className="text-muted-ink">
        · {t('reviewCount', { count: summary.count })}
        {trustpilotUrl ? ` ${t('onTrustpilot')}` : ''}
      </span>
    </>
  );
  const cls = 'mb-4 inline-flex flex-wrap items-center gap-2 text-sm hover:opacity-80';
  return trustpilotUrl ? (
    <a data-testid="rating-summary" href={trustpilotUrl} target="_blank" rel="noopener noreferrer" className={cls}>
      {content}
    </a>
  ) : (
    <a data-testid="rating-summary" href="#reviews" className={cls}>
      {content}
    </a>
  );
}
