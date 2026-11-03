import type { Metadata } from 'next';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { formatBeirut } from '@/lib/dates';
import { PEST_LABELS, type PestKey } from '@/lib/pests';
import { formatLebanesePhone } from '@/lib/phone';
import { getDb } from '@/server/db/client';
import { countDeliverySignups, listDeliverySignups } from '@/server/delivery-signups';
import { requireAdmin } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'Subscribers' };

const PAGE_SIZE = 50;

export default async function SubscribersPage({ searchParams }: PageProps<'/admin/subscribers'>) {
  await requireAdmin('subscribers');
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = getDb();
  const [rows, total] = await Promise.all([
    listDeliverySignups(db, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countDeliverySignups(db),
  ]);

  return (
    <>
      <PageHeader
        title="Subscribers"
        description={`People who filled in the free-delivery form (${total}). Only send WhatsApp offers to those marked “WhatsApp OK”.`}
        actions={
          <a
            href="/admin/subscribers/export"
            download
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#303030] ring-1 ring-[#e3e3e3] hover:bg-[#f7f7f7]"
          >
            <Download className="size-4" aria-hidden /> Export CSV
          </a>
        }
      />
      <ul className="divide-y divide-[#ebebeb] overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(26,26,26,0.08),0_1px_2px_rgba(26,26,26,0.07)]">
        {rows.map((r) => (
          <li key={r.id} data-testid="subscriber-row" className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <span className="w-36 shrink-0 text-xs text-[#616161]">{formatBeirut(r.createdAt, 'datetime')}</span>
            <span className="min-w-32 font-semibold text-[#303030]">{r.name}</span>
            {r.email ? (
              <a href={`mailto:${r.email}`} className="min-w-48 flex-1 text-blue hover:underline">
                {r.email}
              </a>
            ) : (
              <span className="flex-1" />
            )}
            <span className="text-[#303030]/80" dir="ltr">
              {formatLebanesePhone(r.phone)}
            </span>
            <span
              className={
                r.marketingOptIn
                  ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700'
                  : 'rounded-full bg-[#f1f1f1] px-2 py-0.5 text-xs font-semibold text-[#616161]'
              }
            >
              {r.marketingOptIn ? 'WhatsApp OK' : 'No offers'}
            </span>
            {r.pests.length > 0 && (
              <span className="basis-full text-xs text-[#616161]">
                Pests: {r.pests.map((p) => PEST_LABELS[p as PestKey] ?? p).join(', ')}
              </span>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="p-10 text-center text-[#616161]">No signups yet.</li>}
      </ul>
      {total > PAGE_SIZE && (
        <nav className="mt-4 flex justify-between text-sm">
          {page > 1 ? <Link href={`/admin/subscribers?page=${page - 1}`}>← Newer</Link> : <span />}
          {page * PAGE_SIZE < total && <Link href={`/admin/subscribers?page=${page + 1}`}>Older →</Link>}
        </nav>
      )}
    </>
  );
}
