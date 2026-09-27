import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import type { ReviewSummary, ReviewView } from '@/server/reviews';
import { ReviewCard } from './review-card';
import { ReviewsMore } from './reviews-more';
import { Stars } from './stars';

export async function ReviewsSection({
  locale,
  productId,
  summary,
  reviews,
}: {
  locale: Locale;
  productId: string;
  summary: ReviewSummary;
  reviews: ReviewView[];
}) {
  if (summary.count === 0) return null;
  const t = await getTranslations({ locale, namespace: 'reviews' });
  return (
    <section id="reviews" className="scroll-mt-20 py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[280px_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-3xl font-extrabold tracking-tight text-navy">{t('title')}</h2>
          <div className="mt-6 flex items-end gap-3">
            <span className="text-5xl font-extrabold text-navy">{summary.average.toFixed(1)}</span>
            <Stars value={summary.average} className="mb-2 text-xl" />
          </div>
          <p className="mt-1 text-sm text-muted-ink">{t('basedOn', { count: summary.count })}</p>
          <ul className="mt-5 space-y-1.5">
            {([5, 4, 3, 2, 1] as const).map((n) => {
              const pct = summary.count ? Math.round((summary.distribution[n] / summary.count) * 100) : 0;
              return (
                <li key={n} className="flex items-center gap-2 text-sm">
                  <span className="w-3 font-semibold text-navy">{n}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-8 text-end text-muted-ink tabular-nums">{summary.distribution[n]}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} locale={locale} starsLabel={t('stars', { rating: r.rating })} />
          ))}
          <ReviewsMore productId={productId} initialCount={reviews.length} total={summary.count} />
        </div>
      </div>
    </section>
  );
}
