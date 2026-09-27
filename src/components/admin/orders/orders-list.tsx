'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Printer, X } from 'lucide-react';
import { toast } from 'sonner';
import { bulkStatusAction } from '@/app/admin/(dashboard)/orders/actions';
import { AdminButton } from '@/components/admin/ui';
import { formatBeirut } from '@/lib/dates';
import { districtName, type DistrictId } from '@/lib/lebanon';
import { formatUsd } from '@/lib/money';
import { nextStatuses, STATUS_LABELS, type OrderStatus } from '@/lib/order-status';
import { formatLebanesePhone } from '@/lib/phone';
import type { OrderRow } from '@/server/orders/admin-query';
import { StatusBadge } from './status-badge';

const BULK_TARGETS = ['confirmed', 'out_for_delivery', 'delivered'] as const;
const GRID = 'md:grid md:grid-cols-[28px_84px_128px_minmax(0,1.2fr)_minmax(0,1.3fr)_80px_130px] md:items-center md:gap-4';

export function OrdersList({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  // Offer only the moves every selected order can make.
  const targets = useMemo(() => {
    const chosen = rows.filter((r) => selected.has(r.id));
    if (chosen.length === 0) return [];
    return BULK_TARGETS.filter((to) => chosen.every((r) => nextStatuses(r.status).includes(to)));
  }, [rows, selected]);

  const bulk = (to: (typeof BULK_TARGETS)[number]) =>
    start(async () => {
      const r = await bulkStatusAction({ orderIds: [...selected], to });
      toast.success(`${r.updated} order${r.updated === 1 ? '' : 's'} updated${r.skipped ? ` · ${r.skipped} skipped` : ''}`);
      setSelected(new Set());
      router.refresh();
    });

  if (rows.length === 0) {
    return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No orders match.</p>;
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className={`hidden border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${GRID}`}>
          <input
            type="checkbox"
            aria-label="Select all"
            className="size-4 accent-navy"
            checked={allChecked}
            onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))}
          />
          <span>Order</span>
          <span>Date</span>
          <span>Customer</span>
          <span>Items</span>
          <span className="text-end">Total</span>
          <span>Status</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li
              key={r.id}
              data-testid="order-row"
              data-id={r.id}
              className={`relative px-4 py-3.5 transition hover:bg-slate-50 ${selected.has(r.id) ? 'bg-ice/60' : ''} ${GRID}`}
            >
              <div className="flex items-center justify-between gap-3 md:contents">
                <div className="flex items-center gap-3 md:contents">
                  <input
                    type="checkbox"
                    aria-label={`Select order ${r.number}`}
                    className="size-4 accent-navy"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                  <Link href={`/admin/orders/${r.id}`} className="font-bold text-navy hover:underline">
                    #{r.number}
                  </Link>
                </div>
                <span className="md:hidden">
                  <StatusBadge status={r.status} />
                </span>
              </div>
              <span className="mt-1 block text-xs text-slate-500 md:mt-0 md:text-sm">{formatBeirut(new Date(r.createdAt), 'datetime')}</span>
              <Link href={`/admin/orders/${r.id}`} className="mt-1 block min-w-0 md:mt-0">
                <span className="block truncate font-semibold text-ink">{r.name}</span>
                <span className="block truncate text-xs text-slate-500">
                  {formatLebanesePhone(r.phone)} · {districtName(r.district as DistrictId, 'en')}
                </span>
              </Link>
              <span className="mt-1 block truncate text-sm text-slate-600 md:mt-0">{r.itemsSummary}</span>
              <span className="mt-1 block font-bold text-navy md:mt-0 md:text-end">{formatUsd(r.totalCents)}</span>
              <span className="hidden md:block">
                <StatusBadge status={r.status as OrderStatus} />
              </span>
            </li>
          ))}
        </ul>
      </div>

      {selected.size > 0 && (
        <div
          data-testid="bulk-bar"
          className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-2xl bg-navy p-3 text-white shadow-2xl lg:bottom-6"
        >
          <span className="px-2 text-sm font-semibold">{selected.size} selected</span>
          {targets.map((to) => (
            <AdminButton key={to} size="sm" variant="secondary" disabled={pending} onClick={() => bulk(to)}>
              {STATUS_LABELS[to]}
            </AdminButton>
          ))}
          <a
            href={`/admin/print/orders?ids=${[...selected].join(',')}&format=a4&autoprint=1`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            <Printer className="size-4" /> Print slips
          </a>
          <button type="button" aria-label="Clear selection" className="ms-auto rounded-lg p-2 hover:bg-white/10" onClick={() => setSelected(new Set())}>
            <X className="size-4" />
          </button>
        </div>
      )}
    </>
  );
}
