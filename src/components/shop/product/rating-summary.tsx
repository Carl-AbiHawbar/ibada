import { Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import type { ReviewSummary } from '@/server/reviews';

/** Five brand-blue star tiles; the last one is partly filled for fractional averages. */
function StarTiles({ value, rtl }: { value: number; rtl: boolean }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.round(Math.min(Math.max(value - i, 0), 1) * 100);
        return (
          <span
            key={i}
            className="flex size-6 items-center justify-center rounded-[5px] sm:size-7"
            style={{
              background: `linear-gradient(to ${rtl ? 'left' : 'right'}, var(--color-blue) ${fill}%, #CBD5E1 ${fill}%)`,
            }}
          >
            <Star className="size-4 fill-white text-white sm:size-[18px]" />
          </span>
        );
      })}
    </span>
  );
}

/** Rating badge from the reviews entered in the admin; hidden until there are any. */
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
  const average = summary.average.toFixed(1);
  const word =
    summary.average >= 4.5 ? t('ratedExcellent') : summary.average >= 4 ? t('ratedGreat') : summary.average >= 3 ? t('ratedGood') : null;

  const content = (
    <>
      <StarTiles value={summary.average} rtl={locale === 'ar'} />
      <span className="text-2xl font-extrabold leading-none text-navy">{average}</span>
      <span className="text-sm leading-tight text-muted-ink">
        {word && <span className="block font-bold text-navy">{word}</span>}
        {t('reviewCount', { count: summary.count })}
        {trustpilotUrl ? ` ${t('onTrustpilot')}` : ''}
      </span>
      <span className="sr-only">{t('ratingLabel', { average })}</span>
    </>
  );
  const cls =
    'mb-4 inline-flex items-center gap-3 rounded-2xl border border-blue/15 bg-white/90 px-3.5 py-2.5 shadow-[0_10px_30px_-20px_rgba(1,39,85,0.45)] transition hover:border-blue/40';
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
