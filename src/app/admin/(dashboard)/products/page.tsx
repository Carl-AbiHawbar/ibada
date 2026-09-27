import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { listProductsAdmin } from '@/server/admin/products';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'Products' };

export default async function ProductsPage() {
  await requireAdmin('products');
  const products = await listProductsAdmin(getDb());
  return (
    <>
      <PageHeader
        title="Products"
        actions={
          <Link href="/admin/products/new" className="inline-flex h-11 items-center gap-2 rounded-xl bg-navy px-4 text-[15px] font-semibold text-white hover:bg-navy-700">
            <Plus className="size-4" /> Add product
          </Link>
        }
      />
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {products.map((p) => {
          const low = p.stockUnits <= p.lowStockThreshold;
          return (
            <li key={p.id}>
              <Link href={`/admin/products/${p.id}`} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="56px" className="object-contain p-1" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy">{p.nameEn}</span>
                  <span className="block text-sm text-slate-500">
                    {p.bundleCount} bundle{p.bundleCount === 1 ? '' : 's'} · /{p.slug}
                  </span>
                </span>
                <span className={`text-sm font-semibold ${low ? 'text-red-600' : 'text-slate-600'}`}>{p.stockUnits} in stock</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  {p.status === 'active' ? 'Active' : 'Draft'}
                </span>
              </Link>
            </li>
          );
        })}
        {products.length === 0 && <li className="p-10 text-center text-slate-500">No products yet.</li>}
      </ul>
    </>
  );
}
