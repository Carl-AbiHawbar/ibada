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
              background: `linear-gradient(to ${rtl ? 'left' : 'right'}, var(--color-blue) ${fill}%, rgba(255,255,255,0.25) ${fill}%)`,
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
  sample = false,
}: {
  locale: Locale;
  summary: ReviewSummary;
  trustpilotUrl: string | null;
  /** Private-preview sample data: labelled so it can never pass for real ratings. */
  sample?: boolean;
}) {
  if (summary.count === 0) return null;
  const t = await getTranslations({ locale, namespace: 'hero' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  const average = summary.average.toFixed(1);
  const word =
    summary.average >= 4.5 ? t('ratedExcellent') : summary.average >= 4 ? t('ratedGreat') : summary.average >= 3 ? t('ratedGood') : null;

  const content = (
    <span className="flex flex-col gap-1">
      <span className="flex items-center gap-2.5">
        <StarTiles value={summary.average} rtl={locale === 'ar'} />
        <span className="text-2xl font-extrabold leading-none text-white">{average}</span>
        {sample && <span className="rounded-full bg-amber-300 px-2 py-0.5 text-xs font-bold text-navy">{tc('sample')}</span>}
      </span>
      <span className="text-sm leading-tight text-white/85">
        {word && <span className="font-bold text-white">{word}</span>}
        {word ? ' · ' : ''}
        {t('reviewCount', { count: summary.count })}
        {trustpilotUrl ? ` ${t('onTrustpilot')}` : ''}
      </span>
      <span className="sr-only">{t('ratingLabel', { average })}</span>
    </span>
  );
  const cls =
    'mb-4 inline-flex rounded-2xl bg-navy px-4 py-3 shadow-[0_14px_34px_-18px_rgba(1,39,85,0.7)] transition hover:bg-navy-700';
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
