import { and, count, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
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

// ---------- admin ----------

export const reviewInputSchema = z.object({
  productId: z.uuid(),
  authorName: z.string().trim().min(1, 'Required').max(60),
  rating: z.int().min(1).max(5),
  body: z.string().trim().min(1, 'Required').max(2000),
  locale: z.enum(['en', 'ar']),
  // A day of slack for time zones; reviews can't be dated in the future.
  reviewDate: z.date().refine((d) => d.getTime() <= Date.now() + 86_400_000, 'Date cannot be in the future'),
  photoUrl: z.string().max(500).nullable(),
  visible: z.boolean(),
});

export async function saveReview(
  db: Db,
  a: { id?: string; input: unknown },
): Promise<{ ok: true; id: string } | { ok: false; error: 'invalid' | 'not_found'; fieldErrors?: Record<string, string> }> {
  const parsed = reviewInputSchema.safeParse(a.input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'invalid',
      fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), i.message])),
    };
  }
  if (a.id) {
    const [row] = await db.update(reviews).set(parsed.data).where(eq(reviews.id, a.id)).returning({ id: reviews.id });
    return row ? { ok: true, id: row.id } : { ok: false, error: 'not_found' };
  }
  const [row] = await db.insert(reviews).values(parsed.data).returning({ id: reviews.id });
  return { ok: true, id: row!.id };
}

export async function setReviewVisible(db: Db, id: string, visible: boolean): Promise<void> {
  await db.update(reviews).set({ visible }).where(eq(reviews.id, id));
}

export async function deleteReview(db: Db, id: string): Promise<{ photoUrl: string | null } | null> {
  const [row] = await db.delete(reviews).where(eq(reviews.id, id)).returning({ photoUrl: reviews.photoUrl });
  return row ?? null;
}

export async function listReviewsAdmin(db: Db, f: { visible?: boolean; rating?: number; page: number }) {
  const where = and(
    f.visible === undefined ? undefined : eq(reviews.visible, f.visible),
    f.rating ? eq(reviews.rating, f.rating) : undefined,
  );
  const rows = await db
    .select()
    .from(reviews)
    .where(where)
    .orderBy(desc(reviews.reviewDate), desc(reviews.createdAt))
    .limit(50)
    .offset((Math.max(1, f.page) - 1) * 50);
  return { rows };
}
