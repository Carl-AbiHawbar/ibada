import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/page-header';
import { ReviewsManager } from '@/components/admin/reviews/reviews-manager';
import { beirutDateKey } from '@/lib/dates';
import { listProductsAdmin } from '@/server/admin/products';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { listReviewsAdmin } from '@/server/reviews';

export const metadata: Metadata = { title: 'Reviews' };

export default async function ReviewsPage() {
  await requireAdmin('reviews');
  const db = getDb();
  const [{ rows }, products] = await Promise.all([listReviewsAdmin(db, { page: 1 }), listProductsAdmin(db)]);
  return (
    <>
      <PageHeader title="Reviews" description="Real customer reviews. Only visible ones count toward the stars on the shop." />
      <ReviewsManager
        today={beirutDateKey(new Date())}
        products={products.map((p) => ({ id: p.id, name: p.nameEn }))}
        rows={rows.map((r) => ({
          id: r.id,
          productId: r.productId,
          authorName: r.authorName,
          rating: r.rating,
          body: r.body,
          locale: r.locale,
          reviewDate: beirutDateKey(r.reviewDate),
          photoUrl: r.photoUrl,
          visible: r.visible,
        }))}
      />
    </>
  );
}
