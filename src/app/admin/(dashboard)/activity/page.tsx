import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/admin/page-header';
import { formatBeirut } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { listAudit } from '@/server/audit';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'Activity' };

const ENTITIES = [
  ['', 'All'],
  ['order', 'Orders'],
  ['product', 'Products'],
  ['bundle', 'Bundles'],
  ['discount', 'Discounts'],
  ['review', 'Reviews'],
  ['customer', 'Customers'],
  ['settings', 'Settings'],
  ['staff', 'Staff'],
] as const;

export default async function ActivityPage({ searchParams }: PageProps<'/admin/activity'>) {
  await requireAdmin('activity');
  const sp = await searchParams;
  const entity = ENTITIES.find(([e]) => e && e === sp.entity)?.[0];
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pageSize } = await listAudit(getDb(), { entity, page });
  const href = (patch: Record<string, string>) => `/admin/activity?${new URLSearchParams({ ...(entity ? { entity } : {}), ...patch })}`;

  return (
    <>
      <PageHeader title="Activity" description="Who changed what, and when (Beirut time)." />
      <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {ENTITIES.map(([e, label]) => (
          <Link
            key={e || 'all'}
            href={e ? `/admin/activity?entity=${e}` : '/admin/activity'}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold',
              (entity ?? '') === e ? 'bg-[#e3e3e3] text-[#303030]' : 'bg-white text-[#616161] ring-1 ring-[#e3e3e3]',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <ul className="divide-y divide-[#ebebeb] overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(26,26,26,0.08),0_1px_2px_rgba(26,26,26,0.07)]">
        {rows.map((r) => (
          <li key={r.id} data-testid="audit-row" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
            <span className="w-36 shrink-0 text-xs text-[#616161]">{formatBeirut(r.createdAt, 'datetime')}</span>
            <span className="font-semibold text-[#303030]">{r.actorName ?? 'System'}</span>
            <span className="flex-1 text-[#303030]/80">{r.summary}</span>
            <span className="rounded bg-[#f1f1f1] px-1.5 py-0.5 font-mono text-[11px] text-[#616161]">{r.action}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="p-10 text-center text-[#616161]">Nothing yet.</li>}
      </ul>
      {total > pageSize && (
        <nav className="mt-4 flex justify-between text-sm">
          {page > 1 ? <Link href={href({ page: String(page - 1) })}>← Newer</Link> : <span />}
          {page * pageSize < total && <Link href={href({ page: String(page + 1) })}>Older →</Link>}
        </nav>
      )}
    </>
  );
}
