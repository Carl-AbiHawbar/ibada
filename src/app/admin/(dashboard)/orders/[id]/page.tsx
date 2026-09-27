import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, MapPin, MessageCircle, Phone, Printer } from 'lucide-react';
import { CopyButton } from '@/components/admin/copy-button';
import { NoteForm } from '@/components/admin/orders/note-form';
import { StatusActions } from '@/components/admin/orders/status-actions';
import { StatusBadge } from '@/components/admin/orders/status-badge';
import { PageHeader } from '@/components/admin/page-header';
import { AdminCard } from '@/components/admin/ui';
import { formatBeirut } from '@/lib/dates';
import { districtName, governorateName, type DistrictId, type GovernorateId } from '@/lib/lebanon';
import { formatUsd } from '@/lib/money';
import { STATUS_LABELS } from '@/lib/order-status';
import { formatLebanesePhone } from '@/lib/phone';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { getOrderDetail } from '@/server/orders/admin-query';

export const metadata: Metadata = { title: 'Order' };

export default async function OrderDetailPage({ params }: PageProps<'/admin/orders/[id]'>) {
  await requireAdmin('orders');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const detail = await getOrderDetail(getDb(), id);
  if (!detail) notFound();
  const { order, items, events, customer } = detail;
  const address = [
    order.addressLine,
    order.town,
    districtName(order.district as DistrictId, 'en'),
    governorateName(order.governorate as GovernorateId, 'en'),
  ].join(', ');
  const phoneDigits = order.phone.replace(/\D/g, '');

  return (
    <>
      <PageHeader
        back={{ href: '/admin/orders', label: 'Orders' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            #{order.number} <StatusBadge status={order.status} testId="order-status" />
          </span>
        }
        description={`${formatBeirut(order.createdAt, 'datetime')} · ${order.locale === 'ar' ? 'Arabic' : 'English'} store · ${order.paymentStatus === 'paid' ? 'Cash collected' : 'Cash on delivery (pending)'}`}
        actions={
          <a
            href={`/admin/print/orders?ids=${order.id}&format=label&autoprint=1`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[15px] font-semibold text-navy hover:bg-slate-50"
          >
            <Printer className="size-4" /> Print slip
          </a>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <AdminCard title="Status">
            <StatusActions orderId={order.id} status={order.status} number={order.number} />
          </AdminCard>

          <AdminCard title="Items">
            <ul className="divide-y divide-slate-100">
              {items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-navy">{i.bundleNameEn}</p>
                    <p className="text-slate-500">
                      {i.productNameEn} · {i.unitsPerBundle * i.quantity} device{i.unitsPerBundle * i.quantity === 1 ? '' : 's'} · {formatUsd(i.unitPriceCents)} × {i.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-navy">{formatUsd(i.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd>{formatUsd(order.subtotalCents)}</dd>
              </div>
              {order.discountCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Discount {order.discountCode && `(${order.discountCode})`}</dt>
                  <dd className="text-blue">{formatUsd(-order.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">Delivery</dt>
                <dd>{order.deliveryCents ? formatUsd(order.deliveryCents) : 'Free'}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-navy">
                <dt>COD to collect</dt>
                <dd>{formatUsd(order.totalCents)}</dd>
              </div>
            </dl>
          </AdminCard>

          <AdminCard title="Timeline">
            <ol data-testid="timeline" className="mb-5 space-y-3">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-blue" aria-hidden />
                  <div>
                    <p className="font-medium text-ink">
                      {e.type === 'created'
                        ? 'Order placed'
                        : e.type === 'status_changed'
                          ? `${STATUS_LABELS[e.fromStatus!]} → ${STATUS_LABELS[e.toStatus!]}`
                          : e.note}
                    </p>
                    {e.type === 'status_changed' && e.note && <p className="text-slate-600">{e.note}</p>}
                    <p className="text-xs text-slate-500">
                      {formatBeirut(e.createdAt, 'datetime')} · {e.actorName ?? (e.type === 'created' ? 'Customer' : 'System')}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <NoteForm orderId={order.id} />
          </AdminCard>
        </div>

        <div className="space-y-5">
          <AdminCard title="Customer">
            <p className="font-semibold text-navy">{order.name}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={`tel:${order.phone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-navy">
                <Phone className="size-4" /> {formatLebanesePhone(order.phone)}
              </a>
              <a
                href={`https://wa.me/${phoneDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </div>
            {customer && (
              <>
                <Link href={`/admin/customers/${customer.id}`} className="mt-3 block text-sm font-semibold text-blue hover:underline">
                  {customer.orderCount} order{customer.orderCount === 1 ? '' : 's'} · {formatUsd(customer.totalSpentCents)} spent
                </Link>
                {customer.blocked && (
                  <p className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">
                    <AlertTriangle className="size-4" /> Blocked{customer.blockedReason ? `: ${customer.blockedReason}` : ''}
                  </p>
                )}
              </>
            )}
          </AdminCard>

          <AdminCard title="Delivery address" actions={<CopyButton text={`${order.name}\n${formatLebanesePhone(order.phone)}\n${address}${order.landmark ? `\nLandmark: ${order.landmark}` : ''}`} />}>
            <p className="flex gap-2 text-sm text-ink">
              <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" /> {address}
            </p>
            {order.landmark && <p className="mt-2 text-sm text-slate-600">Landmark: {order.landmark}</p>}
            {order.notes && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">Note: {order.notes}</p>}
          </AdminCard>
        </div>
      </div>
    </>
  );
}
