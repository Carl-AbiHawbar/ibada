import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ImageIcon, Plus } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { AdminBadge, adminButtonClass, cardClass } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
import { listProductsAdmin } from '@/server/admin/products';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'Products' };

const GRID = 'sm:grid sm:grid-cols-[48px_minmax(0,1fr)_96px_150px_90px] sm:items-center sm:gap-4';

export default async function ProductsPage() {
  await requireAdmin('products');
  const products = await listProductsAdmin(getDb());
  return (
    <>
      <PageHeader
        title="Products"
        actions={
          <Link href="/admin/products/new" className={adminButtonClass('primary')}>
            <Plus /> Add product
          </Link>
        }
      />
      <section className={cn(cardClass, 'overflow-hidden')}>
        <div className={cn('hidden border-b border-[#e3e3e3] bg-[#f7f7f7] px-4 py-2 text-xs font-medium text-[#616161]', GRID)}>
          <span />
          <span>Product</span>
          <span>Status</span>
          <span>Inventory</span>
          <span>Bundles</span>
        </div>
        <ul className="divide-y divide-[#ebebeb]">
          {products.map((p) => {
            const low = p.stockUnits <= p.lowStockThreshold;
            return (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className={cn('flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-[#f7f7f7]', GRID)}>
                  <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e3e3e3] bg-white text-[#b5b5b5]">
                    {p.imageUrl ? <Image src={p.imageUrl} alt="" fill sizes="40px" className="object-contain p-0.5" /> : <ImageIcon className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-[#303030]">{p.nameEn}</span>
                    <span className="block truncate text-xs text-[#616161]">/{p.slug}</span>
                  </span>
                  <span>
                    <AdminBadge tone={p.status === 'active' ? 'success' : 'info'}>{p.status === 'active' ? 'Active' : 'Draft'}</AdminBadge>
                  </span>
                  <span className={cn('hidden sm:block', low ? 'font-medium text-[#8e1f0b]' : 'text-[#616161]')}>{p.stockUnits} in stock</span>
                  <span className="hidden text-[#616161] sm:block">
                    {p.bundleCount} bundle{p.bundleCount === 1 ? '' : 's'}
                  </span>
                </Link>
              </li>
            );
          })}
          {products.length === 0 && <li className="p-10 text-center text-[13px] text-[#616161]">No products yet.</li>}
        </ul>
      </section>
    </>
  );
}
