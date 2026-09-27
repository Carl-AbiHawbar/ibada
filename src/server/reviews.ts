import { and, count, desc, eq } from 'drizzle-orm';
import type { Db } from './db/client';
import { reviews } from './db/schema';

export type ReviewView = {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  locale: 'en' | 'ar';
  photoUrl: string | null;
  reviewDate: string;
};

export type ReviewSummary = { count: number; average: number; distribution: Record<1 | 2 | 3 | 4 | 5, number> };

export async function getReviewSummary(db: Db, productId: string): Promise<ReviewSummary> {
  const rows = await db
    .select({ rating: reviews.rating, n: count() })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.visible, true)))
    .groupBy(reviews.rating);
  const distribution: ReviewSummary['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;
  for (const r of rows) {
    distribution[r.rating as 1 | 2 | 3 | 4 | 5] = r.n;
    total += r.n;
    sum += r.rating * r.n;
  }
  return { count: total, average: total === 0 ? 0 : Math.round((sum / total) * 10) / 10, distribution };
}

export async function listVisibleReviews(
  db: Db,
  productId: string,
  opts: { limit: number; offset: number },
): Promise<ReviewView[]> {
  const rows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.visible, true)))
    .orderBy(desc(reviews.reviewDate), desc(reviews.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return rows.map((r) => ({
    id: r.id,
    authorName: r.authorName,
    rating: r.rating,
    body: r.body,
    locale: r.locale,
    photoUrl: r.photoUrl,
    reviewDate: r.reviewDate.toISOString(),
  }));
}
