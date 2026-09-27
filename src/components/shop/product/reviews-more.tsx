'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { loadMoreReviewsAction } from '@/app/[locale]/(shop)/actions';
import type { ReviewView } from '@/server/reviews';
import { ReviewCard } from './review-card';

export const REVIEWS_PAGE = 6;

export function ReviewsMore({ productId, initialCount, total }: { productId: string; initialCount: number; total: number }) {
  const t = useTranslations('reviews');
  const locale = useLocale() as 'en' | 'ar';
  const [extra, setExtra] = useState<ReviewView[]>([]);
  const [pending, start] = useTransition();
  const shown = initialCount + extra.length;

  return (
    <>
      {extra.map((r) => (
        <ReviewCard key={r.id} review={r} locale={locale} starsLabel={t('stars', { rating: r.rating })} />
      ))}
      {shown < total && (
        <div className="col-span-full flex justify-center">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const next = await loadMoreReviewsAction(productId, shown);
                setExtra((cur) => [...cur, ...next]);
              })
            }
            className="h-11 rounded-full border-2 border-navy px-6 text-sm font-bold text-navy transition hover:bg-navy hover:text-white disabled:opacity-50"
          >
            {t('loadMore')}
          </button>
        </div>
      )}
    </>
  );
}
