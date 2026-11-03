'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, Search } from 'lucide-react';
import { adminButtonClass, AdminInput, AdminSelect } from '@/components/admin/ui';
import { ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from '@/lib/order-status';
import { cn } from '@/lib/utils';

/** Tabs, search, date filter and export: the top of the orders card. */
export function OrdersToolbar({ counts }: { counts: Record<OrderStatus | 'all', number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const status = params.get('status') ?? '';
  const range = params.get('range') ?? '';

  const withParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete('page');
    const s = next.toString();
    return s ? `${pathname}?${s}` : pathname;
  };

  // Debounced search that keeps the other filters.
  useEffect(() => {
    if ((params.get('q') ?? '') === q) return;
    const t = setTimeout(() => router.replace(withParams({ q: q.trim() || null })), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const exportParams = new URLSearchParams(params);
  exportParams.delete('page');

  return (
    <div className="border-b border-[#e3e3e3]">
      <nav aria-label="Order status" role="tablist" className="flex gap-1 overflow-x-auto px-2 pt-2">
        {(['', ...ORDER_STATUSES] as const).map((s) => {
          const active = status === s;
          return (
            <Link
              key={s || 'all'}
              href={withParams({ status: s || null })}
              role="tab"
              aria-selected={active}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition',
                active ? 'bg-[#e3e3e3] font-semibold text-[#303030]' : 'text-[#616161] hover:bg-black/5 hover:text-[#1a1a1a]',
              )}
            >
              {s ? STATUS_LABELS[s] : 'All'}
              <span className="text-xs tabular-nums text-[#8a8a8a]">{counts[s || 'all']}</span>
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-wrap gap-2 p-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" aria-hidden />
          <AdminInput
            aria-label="Search orders"
            placeholder="Search by order #, name or phone"
            className="ps-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <AdminSelect aria-label="Date range" className="w-auto" value={range} onChange={(e) => router.replace(withParams({ range: e.target.value || null }))}>
          <option value="">All time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </AdminSelect>
        <a href={`/admin/orders/export?${exportParams.toString()}`} className={cn(adminButtonClass('secondary'), 'h-11 lg:h-9')}>
          <Download /> Export CSV
        </a>
      </div>
    </div>
  );
}
