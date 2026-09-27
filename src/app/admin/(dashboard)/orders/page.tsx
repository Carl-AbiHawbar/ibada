import type { Metadata } from 'next';
import Link from 'next/link';
import { OrdersList } from '@/components/admin/orders/orders-list';
import { OrdersToolbar } from '@/components/admin/orders/orders-toolbar';
import { PageHeader } from '@/components/admin/page-header';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { listOrders, orderStatusCounts, ORDERS_PAGE_SIZE } from '@/server/orders/admin-query';
import { parseOrderFilters } from '@/server/orders/filters';

export const metadata: Metadata = { title: 'Orders' };

export default async function OrdersPage({ searchParams }: PageProps<'/admin/orders'>) {
  await requireAdmin('orders');
  const params = await searchParams;
  const filters = parseOrderFilters(params);
  const db = getDb();
  const [{ rows, total }, counts] = await Promise.all([listOrders(db, filters), orderStatusCounts(db)]);
  const pages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
  const pageHref = (p: number) => {
    const next = new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])));
    next.set('page', String(p));
    return `/admin/orders?${next.toString()}`;
  };

  return (
    <>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? '' : 's'}`} />
      <OrdersToolbar counts={counts} />
      <OrdersList rows={rows} />
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pages">
          {filters.page > 1 ? (
            <Link className="font-semibold text-navy hover:underline" href={pageHref(filters.page - 1)}>
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-slate-500">
            Page {filters.page} of {pages}
          </span>
          {filters.page < pages ? (
            <Link className="font-semibold text-navy hover:underline" href={pageHref(filters.page + 1)}>
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
