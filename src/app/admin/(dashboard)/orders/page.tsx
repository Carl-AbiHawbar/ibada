import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OrdersList } from '@/components/admin/orders/orders-list';
import { OrdersToolbar } from '@/components/admin/orders/orders-toolbar';
import { PageHeader } from '@/components/admin/page-header';
import { cardClass } from '@/components/admin/ui';
import { cn } from '@/lib/utils';
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
  const arrow = 'flex size-8 items-center justify-center rounded-lg bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.12)]';

  return (
    <>
      <PageHeader title="Orders" description={`${total} order${total === 1 ? '' : 's'}`} />
      <section className={cn(cardClass, 'overflow-hidden')}>
        <OrdersToolbar counts={counts} />
        <OrdersList rows={rows} />
        {pages > 1 && (
          <nav className="flex items-center justify-center gap-3 border-t border-[#e3e3e3] bg-[#f7f7f7] px-3 py-2 text-[13px]" aria-label="Pages">
            {filters.page > 1 ? (
              <Link className={cn(arrow, 'hover:bg-[#f7f7f7]')} href={pageHref(filters.page - 1)} aria-label="Previous page">
                <ChevronLeft className="size-4" />
              </Link>
            ) : (
              <span className={cn(arrow, 'opacity-40')} aria-hidden>
                <ChevronLeft className="size-4" />
              </span>
            )}
            <span className="text-[#616161]">
              Page {filters.page} of {pages}
            </span>
            {filters.page < pages ? (
              <Link className={cn(arrow, 'hover:bg-[#f7f7f7]')} href={pageHref(filters.page + 1)} aria-label="Next page">
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className={cn(arrow, 'opacity-40')} aria-hidden>
                <ChevronRight className="size-4" />
              </span>
            )}
          </nav>
        )}
      </section>
    </>
  );
}
