import Image from 'next/image';
import type { ReviewView } from '@/server/reviews';
import { Stars } from './stars';

export function ReviewCard({ review, starsLabel, locale }: { review: ReviewView; starsLabel: string; locale: 'en' | 'ar' }) {
  const date = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB-u-nu-latn' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(review.reviewDate));
  return (
    <article className="flex flex-col gap-3 rounded-3xl border border-line bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <span role="img" aria-label={starsLabel}>
          <Stars value={review.rating} className="text-base" />
        </span>
        <time className="text-xs text-muted-ink" dateTime={review.reviewDate}>
          {date}
        </time>
      </div>
      <p className="whitespace-pre-line leading-relaxed text-ink/90" dir="auto">
        {review.body}
      </p>
      {review.photoUrl && (
        <span className="relative h-40 overflow-hidden rounded-2xl bg-ice">
          <Image src={review.photoUrl} alt="" fill sizes="(min-width: 768px) 30vw, 90vw" className="object-cover" />
        </span>
      )}
      <p className="mt-auto text-sm font-bold text-navy" dir="auto">
        {review.authorName}
      </p>
    </article>
  );
}
