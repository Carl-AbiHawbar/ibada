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
import { nextStatuses, STATUS_LABELS } from '@/lib/order-status';
import { formatLebanesePhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import type { OrderRow } from '@/server/orders/admin-query';
import { PaymentBadge, StatusBadge } from './status-badge';

const BULK_TARGETS = ['confirmed', 'out_for_delivery', 'delivered'] as const;
const GRID =
  'md:grid md:grid-cols-[20px_64px_118px_minmax(0,1.2fr)_76px_132px_124px_minmax(0,1fr)] md:items-center md:gap-3';

/** The orders index table (Shopify-style), with checkboxes and a bulk action bar. */
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
    return <p className="px-4 py-14 text-center text-[13px] text-[#616161]">No orders match these filters.</p>;
  }

  return (
    <>
      <div
        className={`hidden border-b border-[#e3e3e3] bg-[#f7f7f7] px-3 py-2 text-xs font-medium text-[#616161] ${GRID}`}
      >
        <input
          type="checkbox"
          aria-label="Select all"
          className="size-4 accent-[#303030]"
          checked={allChecked}
          onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))}
        />
        <span>Order</span>
        <span>Date</span>
        <span>Customer</span>
        <span className="text-end">Total</span>
        <span>Payment</span>
        <span>Status</span>
        <span>Items</span>
      </div>
      <ul className="divide-y divide-[#ebebeb]">
        {rows.map((r) => (
          <li
            key={r.id}
            data-testid="order-row"
            data-id={r.id}
            className={cn('relative px-3 py-3 text-[13px] transition hover:bg-[#f7f7f7] md:py-2', selected.has(r.id) && 'bg-[#f1f1f1]', GRID)}
          >
            <div className="flex items-center justify-between gap-3 md:contents">
              <div className="flex items-center gap-3 md:contents">
                <input
                  type="checkbox"
                  aria-label={`Select order ${r.number}`}
                  className="size-4 accent-[#303030]"
                  checked={selected.has(r.id)}
                  onChange={() => toggle(r.id)}
                />
                <Link href={`/admin/orders/${r.id}`} className="font-semibold text-[#303030] hover:underline">
                  #{r.number}
                </Link>
              </div>
              <span className="font-semibold tabular-nums md:hidden">{formatUsd(r.totalCents)}</span>
            </div>
            <span className="mt-1 block text-xs text-[#616161] md:mt-0 md:text-[13px]">{formatBeirut(new Date(r.createdAt), 'datetime')}</span>
            <Link href={`/admin/orders/${r.id}`} className="mt-1 block min-w-0 md:mt-0">
              <span className="block truncate font-medium text-[#303030]">{r.name}</span>
              <span className="block truncate text-xs text-[#616161]">
                {formatLebanesePhone(r.phone)} · {districtName(r.district as DistrictId, 'en')}
              </span>
            </Link>
            <span className="hidden text-end tabular-nums md:block">{formatUsd(r.totalCents)}</span>
            <span className="mt-2 inline-flex md:mt-0">
              <PaymentBadge status={r.status} paymentStatus={r.paymentStatus} />
            </span>
            <span className="ms-1.5 mt-2 inline-flex md:ms-0 md:mt-0">
              <StatusBadge status={r.status} />
            </span>
            <span className="mt-1 block truncate text-[#616161] md:mt-0">{r.itemsSummary}</span>
          </li>
        ))}
      </ul>

      {selected.size > 0 && (
        <div
          data-testid="bulk-bar"
          className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-xl bg-[#1a1a1a] p-2.5 text-white shadow-2xl lg:bottom-6"
        >
          <span className="px-2 text-[13px] font-semibold">{selected.size} selected</span>
          {targets.map((to) => (
            <AdminButton key={to} size="sm" variant="secondary" disabled={pending} onClick={() => bulk(to)}>
              {STATUS_LABELS[to]}
            </AdminButton>
          ))}
          <a
            href={`/admin/print/orders?ids=${[...selected].join(',')}&format=a4&autoprint=1`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-white hover:bg-white/10 lg:h-7"
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
