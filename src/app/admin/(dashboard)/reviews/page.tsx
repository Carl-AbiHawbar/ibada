import type { Metadata } from 'next';
import { Eye } from 'lucide-react';
import { CopyButton } from '@/components/admin/copy-button';
import { PageHeader } from '@/components/admin/page-header';
import { ReviewsManager } from '@/components/admin/reviews/reviews-manager';
import { getEnv } from '@/env';
import { beirutDateKey } from '@/lib/dates';
import { listProductsAdmin } from '@/server/admin/products';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { createPreviewToken } from '@/server/preview';
import { listReviewsAdmin } from '@/server/reviews';

export const metadata: Metadata = { title: 'Reviews' };

export default async function ReviewsPage() {
  await requireAdmin('reviews');
  const db = getDb();
  const [{ rows }, products] = await Promise.all([listReviewsAdmin(db, { page: 1 }), listProductsAdmin(db)]);
  const previewUrl = `${getEnv().SITE_URL}/api/preview?token=${encodeURIComponent(createPreviewToken())}`;
  return (
    <>
      <PageHeader title="Reviews" description="Real customer reviews. Only visible ones count toward the stars on the shop." />
      {rows.length === 0 && (
        <div data-testid="preview-link" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-navy">
            <Eye className="size-4" aria-hidden /> Preview how reviews will look
          </p>
          <p className="mt-1 text-slate-600">
            This private link shows the shop with sample reviews, marked “Sample”, to whoever opens it. Shoppers never see
            them. The link works for 7 days.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a href={previewUrl} target="_blank" rel="noopener" className="rounded-full bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-navy-700">
              Open preview
            </a>
            <CopyButton text={previewUrl} label="Copy link" />
          </div>
        </div>
      )}
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
