import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { BundlesEditor } from '@/components/admin/products/bundles-editor';
import { MediaManager } from '@/components/admin/products/media-manager';
import { ProductForm } from '@/components/admin/products/product-form';
import { AdminCard } from '@/components/admin/ui';
import { getProductAdmin } from '@/server/admin/products';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'Product' };

export default async function ProductPage({ params }: PageProps<'/admin/products/[id]'>) {
  await requireAdmin('products');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getProductAdmin(getDb(), id);
  if (!data) notFound();
  const { product: p, images, bundles } = data;

  return (
    <>
      <PageHeader
        title={p.nameEn}
        back={{ href: '/admin/products', label: 'Products' }}
        actions={
          p.status === 'active' && (
            <a href={`/en/products/${p.slug}`} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[15px] font-semibold text-navy hover:bg-slate-50">
              View in shop <ExternalLink className="size-4" />
            </a>
          )
        }
      />
      <div className="space-y-5">
        <MediaManager productId={p.id} images={images.map((i) => ({ id: i.id, url: i.url, altEn: i.altEn, altAr: i.altAr }))} />
        <BundlesEditor productId={p.id} bundles={bundles} images={images.map((i) => ({ id: i.id, url: i.url }))} />
        <AdminCard title="Stock">
          <p className="text-sm text-slate-600">
            <span className="text-2xl font-extrabold text-navy">{p.stockUnits}</span> devices in stock · alert at {p.lowStockThreshold}.{' '}
            <Link href="/admin/inventory" className="font-semibold text-blue hover:underline">
              Adjust stock
            </Link>
          </p>
        </AdminCard>
        <ProductForm
          id={p.id}
          initial={{
            slug: p.slug,
            nameEn: p.nameEn,
            nameAr: p.nameAr,
            taglineEn: p.taglineEn,
            taglineAr: p.taglineAr,
            descriptionEn: p.descriptionEn,
            descriptionAr: p.descriptionAr,
            seoTitleEn: p.seoTitleEn,
            seoTitleAr: p.seoTitleAr,
            seoDescriptionEn: p.seoDescriptionEn,
            seoDescriptionAr: p.seoDescriptionAr,
            status: p.status,
            lowStockThreshold: p.lowStockThreshold,
          }}
        />
      </div>
    </>
  );
}
