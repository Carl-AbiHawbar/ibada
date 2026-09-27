import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { AdminInput } from '@/components/admin/ui';
import { formatBeirut } from '@/lib/dates';
import { formatUsd } from '@/lib/money';
import { formatLebanesePhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { listCustomers, type CustomerSort } from '@/server/admin/customers';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'Customers' };

const SORTS: [CustomerSort, string][] = [
  ['recent', 'Recent'],
  ['spent', 'Top spenders'],
  ['orders', 'Most orders'],
];

export default async function CustomersPage({ searchParams }: PageProps<'/admin/customers'>) {
  await requireAdmin('customers');
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 80) : '';
  const sort = (SORTS.find(([s]) => s === sp.sort)?.[0] ?? 'recent') as CustomerSort;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pageSize } = await listCustomers(getDb(), { q, sort, page });
  const link = (patch: Record<string, string>) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), sort, ...patch })}`;

  return (
    <>
      <PageHeader title="Customers" description={`${total} customer${total === 1 ? '' : 's'} · created automatically from orders`} />
      <form className="mb-4 flex flex-wrap gap-2" action="/admin/customers">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <AdminInput name="q" defaultValue={q} aria-label="Search customers" placeholder="Search by name or phone" className="ps-9" />
          <input type="hidden" name="sort" value={sort} />
        </div>
        <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
          {SORTS.map(([s, label]) => (
            <Link
              key={s}
              href={link({ sort: s })}
              className={cn('rounded-lg px-3 py-2 text-sm font-semibold', s === sort ? 'bg-navy text-white' : 'text-slate-600 hover:text-navy')}
            >
              {label}
            </Link>
          ))}
        </div>
      </form>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {rows.map((c) => (
          <li key={c.id} data-testid="customer-row">
            <Link href={`/admin/customers/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 hover:bg-slate-50">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-navy">
                  {c.name} {c.blocked && <span className="ms-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Blocked</span>}
                </span>
                <span className="block text-sm text-slate-500">{formatLebanesePhone(c.phone)}</span>
              </span>
              <span className="text-sm text-slate-600">
                {c.orderCount} order{c.orderCount === 1 ? '' : 's'}
              </span>
              <span className="w-20 text-end font-bold text-navy">{formatUsd(c.totalSpentCents)}</span>
              <span className="w-32 text-end text-xs text-slate-500">{c.lastOrderAt ? formatBeirut(c.lastOrderAt, 'date') : '—'}</span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="p-10 text-center text-slate-500">No customers found.</li>}
      </ul>
      {total > pageSize && (
        <nav className="mt-4 flex justify-between text-sm">
          {page > 1 ? <Link href={link({ page: String(page - 1) })}>← Previous</Link> : <span />}
          {page * pageSize < total && <Link href={link({ page: String(page + 1) })}>Next →</Link>}
        </nav>
      )}
    </>
  );
}
