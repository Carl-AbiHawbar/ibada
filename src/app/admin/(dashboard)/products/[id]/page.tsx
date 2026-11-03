import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { BundlesEditor } from '@/components/admin/products/bundles-editor';
import { MediaManager } from '@/components/admin/products/media-manager';
import { ProductForm } from '@/components/admin/products/product-form';
import { AdminBadge, AdminCard, adminButtonClass } from '@/components/admin/ui';
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
        title={
          <span className="flex flex-wrap items-center gap-2">
            {p.nameEn}
            <AdminBadge tone={p.status === 'active' ? 'success' : 'info'} className="font-normal">
              {p.status === 'active' ? 'Active' : 'Draft'}
            </AdminBadge>
          </span>
        }
        back={{ href: '/admin/products', label: 'Products' }}
        actions={
          p.status === 'active' && (
            <a href={`/en/products/${p.slug}`} target="_blank" rel="noopener" className={adminButtonClass('secondary')}>
              View in shop <ExternalLink className="size-4" />
            </a>
          )
        }
      />
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
        main={
          <>
            <MediaManager productId={p.id} images={images.map((i) => ({ id: i.id, url: i.url, altEn: i.altEn, altAr: i.altAr }))} />
            <BundlesEditor productId={p.id} bundles={bundles} images={images.map((i) => ({ id: i.id, url: i.url }))} />
          </>
        }
        side={
          <AdminCard title="Inventory">
            <p className="text-[13px] text-[#616161]">
              <span className="text-xl font-bold text-[#303030]">{p.stockUnits}</span> devices in stock
            </p>
            <Link href="/admin/inventory" className="mt-1 inline-block text-[13px] font-medium text-blue hover:underline">
              Adjust stock
            </Link>
          </AdminCard>
        }
      />
    </>
  );
}
