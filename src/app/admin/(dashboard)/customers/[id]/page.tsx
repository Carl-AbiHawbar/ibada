import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle, Phone, ShieldAlert } from 'lucide-react';
import { BlockControls, NotesForm } from '@/components/admin/customers/customer-controls';
import { StatusBadge } from '@/components/admin/orders/status-badge';
import { PageHeader } from '@/components/admin/page-header';
import { AdminCard } from '@/components/admin/ui';
import { formatBeirut } from '@/lib/dates';
import { formatUsd } from '@/lib/money';
import { formatLebanesePhone } from '@/lib/phone';
import { getCustomer } from '@/server/admin/customers';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'Customer' };

export default async function CustomerPage({ params }: PageProps<'/admin/customers/[id]'>) {
  await requireAdmin('customers');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getCustomer(getDb(), id);
  if (!data) notFound();
  const { customer: c, orders } = data;

  return (
    <>
      <PageHeader
        back={{ href: '/admin/customers', label: 'Customers' }}
        title={c.name}
        description={formatLebanesePhone(c.phone)}
        actions={<BlockControls customerId={c.id} blocked={c.blocked} />}
      />
      {c.blocked && (
        <p data-testid="blocked-badge" className="mb-5 flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          <ShieldAlert className="size-5" /> Blocked{c.blockedReason ? `: ${c.blockedReason}` : ''} — this number can&apos;t place orders.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ['Orders', String(c.orderCount)],
          ['Spent (delivered)', formatUsd(c.totalSpentCents)],
          ['Last order', c.lastOrderAt ? formatBeirut(c.lastOrderAt, 'date') : '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-navy">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <AdminCard title="Orders">
          <ul data-testid="customer-orders" className="divide-y divide-slate-100">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-3 text-sm hover:bg-slate-50">
                  <span className="font-bold text-navy">#{o.number}</span>
                  <span className="text-slate-500">{formatBeirut(o.createdAt, 'date')}</span>
                  <StatusBadge status={o.status} />
                  <span className="ms-auto font-semibold text-navy">{formatUsd(o.totalCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </AdminCard>
        <div className="space-y-5">
          <AdminCard title="Contact">
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-navy">
                <Phone className="size-4" /> Call
              </a>
              <a
                href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </div>
          </AdminCard>
          <AdminCard title="Notes">
            <NotesForm customerId={c.id} initial={c.notes} />
          </AdminCard>
        </div>
      </div>
    </>
  );
}
