'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, Search } from 'lucide-react';
import { AdminInput, AdminSelect } from '@/components/admin/ui';
import { ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from '@/lib/order-status';
import { cn } from '@/lib/utils';

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
    <div className="mb-4 space-y-3">
      <nav aria-label="Order status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {(['', ...ORDER_STATUSES] as const).map((s) => {
          const active = status === s;
          return (
            <Link
              key={s || 'all'}
              href={withParams({ status: s || null })}
              role="tab"
              aria-selected={active}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
                active ? 'bg-navy text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-navy',
              )}
            >
              {s ? STATUS_LABELS[s] : 'All'}
              <span className={cn('rounded-full px-1.5 text-xs', active ? 'bg-white/20' : 'bg-slate-100')}>{counts[s || 'all']}</span>
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
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
        <a
          href={`/admin/orders/export?${exportParams.toString()}`}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[15px] font-semibold text-navy hover:bg-slate-50"
        >
          <Download className="size-4" /> Export CSV
        </a>
      </div>
    </div>
  );
}
