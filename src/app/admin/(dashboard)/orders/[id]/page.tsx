import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, MessageCircle, Package, Phone, Printer } from 'lucide-react';
import { CopyButton } from '@/components/admin/copy-button';
import { NoteForm } from '@/components/admin/orders/note-form';
import { StatusActions } from '@/components/admin/orders/status-actions';
import { PaymentBadge, StatusBadge } from '@/components/admin/orders/status-badge';
import { PageHeader } from '@/components/admin/page-header';
import { AdminCard, adminButtonClass } from '@/components/admin/ui';
import { formatBeirut } from '@/lib/dates';
import { districtName, governorateName, type DistrictId, type GovernorateId } from '@/lib/lebanon';
import { formatUsd } from '@/lib/money';
import { STATUS_LABELS } from '@/lib/order-status';
import { formatLebanesePhone } from '@/lib/phone';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { getOrderDetail } from '@/server/orders/admin-query';

export const metadata: Metadata = { title: 'Order' };

function Row({ label, sub, value, strong }: { label: string; sub?: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? 'font-semibold text-[#303030]' : ''}`}>
      <dt className="flex gap-6">
        <span>{label}</span>
        {sub && <span className="text-[#616161]">{sub}</span>}
      </dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

export default async function OrderDetailPage({ params }: PageProps<'/admin/orders/[id]'>) {
  await requireAdmin('orders');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const detail = await getOrderDetail(getDb(), id);
  if (!detail) notFound();
  const { order, items, events, customer } = detail;
  const district = districtName(order.district as DistrictId, 'en');
  const address = [order.addressLine, order.town, district, governorateName(order.governorate as GovernorateId, 'en')].join(', ');
  const phoneDigits = order.phone.replace(/\D/g, '');
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const paid = order.paymentStatus === 'paid';

  return (
    <>
      <PageHeader
        back={{ href: '/admin/orders', label: 'Orders' }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            #{order.number}
            <span className="flex gap-1.5 text-xs font-normal">
              <PaymentBadge status={order.status} paymentStatus={order.paymentStatus} />
              <StatusBadge status={order.status} testId="order-status" />
            </span>
          </span>
        }
        description={`${formatBeirut(order.createdAt, 'datetime')} from the online store (${order.locale === 'ar' ? 'Arabic' : 'English'})`}
        actions={
          <a href={`/admin/print/orders?ids=${order.id}&format=label&autoprint=1`} target="_blank" rel="noopener" className={adminButtonClass('secondary')}>
            <Printer /> Print slip
          </a>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <AdminCard
            title={
              <span className="flex items-center gap-2">
                <StatusBadge status={order.status} />
                <span className="font-normal text-[#616161]">
                  {itemCount} item{itemCount === 1 ? '' : 's'} · Delivery to {district}
                </span>
              </span>
            }
          >
            <ul className="divide-y divide-[#ebebeb] rounded-lg border border-[#e3e3e3]">
              {items.map((i) => {
                const devices = i.unitsPerBundle * i.quantity;
                return (
                  <li key={i.id} className="flex items-center gap-3 p-3 text-[13px]">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#e3e3e3] bg-[#f7f7f7] text-[#8a8a8a]">
                      <Package className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#303030]">{i.bundleNameEn}</p>
                      <p className="text-[#616161]">
                        {i.productNameEn} · {devices} device{devices === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span className="tabular-nums text-[#616161]">
                      {formatUsd(i.unitPriceCents)} × {i.quantity}
                    </span>
                    <span className="w-16 text-end font-medium tabular-nums">{formatUsd(i.lineTotalCents)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 border-t border-[#ebebeb] pt-3">
              <StatusActions orderId={order.id} status={order.status} number={order.number} />
            </div>
          </AdminCard>

          <AdminCard title={<PaymentBadge status={order.status} paymentStatus={order.paymentStatus} />}>
            <dl className="space-y-2 rounded-lg border border-[#e3e3e3] p-3 text-[13px]">
              <Row label="Subtotal" sub={`${itemCount} item${itemCount === 1 ? '' : 's'}`} value={formatUsd(order.subtotalCents)} />
              {order.discountCents > 0 && <Row label="Discount" sub={order.discountCode ?? undefined} value={formatUsd(-order.discountCents)} />}
              <Row label="Delivery" value={order.deliveryCents ? formatUsd(order.deliveryCents) : 'Free'} />
              <Row label="Total" value={formatUsd(order.totalCents)} strong />
              <div className="border-t border-[#ebebeb] pt-2">
                <Row label="Paid by customer" value={formatUsd(paid ? order.totalCents : 0)} />
              </div>
              <Row label={paid ? 'Balance' : 'Cash to collect on delivery'} value={formatUsd(paid ? 0 : order.totalCents)} strong />
            </dl>
          </AdminCard>

          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold text-[#303030]">Timeline</h2>
            <NoteForm orderId={order.id} />
            <ol data-testid="timeline" className="relative ms-4 mt-4 space-y-4 border-s-2 border-[#d4d4d4] ps-5">
              {[...events].reverse().map((e) => (
                <li key={e.id} className="relative text-[13px]">
                  <span className="absolute -start-[27px] top-1 size-3 rounded-full border-2 border-[#f1f1f1] bg-[#8a8a8a]" aria-hidden />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="font-medium text-[#303030]">
                      {e.type === 'created'
                        ? 'Order placed'
                        : e.type === 'status_changed'
                          ? `${STATUS_LABELS[e.fromStatus!]} → ${STATUS_LABELS[e.toStatus!]}`
                          : e.note}
                    </p>
                    <p className="text-xs text-[#616161]">{formatBeirut(e.createdAt, 'datetime')}</p>
                  </div>
                  {e.type === 'status_changed' && e.note && <p className="text-[#616161]">{e.note}</p>}
                  <p className="text-xs text-[#8a8a8a]">{e.actorName ?? (e.type === 'created' ? 'Customer' : 'System')}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-4">
          <AdminCard title="Notes">
            <p className="text-[13px] text-[#616161]">{order.notes ? <span className="text-[#303030]">{order.notes}</span> : 'No notes from the customer'}</p>
          </AdminCard>

          <AdminCard title="Customer">
            {customer ? (
              <Link href={`/admin/customers/${customer.id}`} className="text-[13px] font-semibold text-blue hover:underline">
                {order.name}
              </Link>
            ) : (
              <p className="text-[13px] font-semibold">{order.name}</p>
            )}
            {customer && (
              <p className="text-[13px] text-[#616161]">
                {customer.orderCount} order{customer.orderCount === 1 ? '' : 's'} · {formatUsd(customer.totalSpentCents)} spent
              </p>
            )}
            {customer?.blocked && (
              <p className="mt-2 flex items-center gap-2 rounded-lg bg-[#fedad9] p-2 text-[13px] font-semibold text-[#8e1f0b]">
                <AlertTriangle className="size-4" /> Blocked{customer.blockedReason ? `: ${customer.blockedReason}` : ''}
              </p>
            )}
            <h3 className="mt-4 text-[13px] font-semibold">Contact information</h3>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <a href={`tel:${order.phone}`} className="inline-flex items-center gap-1.5 text-[13px] text-blue hover:underline">
                <Phone className="size-3.5" /> {formatLebanesePhone(order.phone)}
              </a>
              <a
                href={`https://wa.me/${phoneDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] text-[#0c5132] hover:underline"
              >
                <MessageCircle className="size-3.5" /> WhatsApp
              </a>
            </div>
          </AdminCard>

          <AdminCard
            title="Delivery address"
            actions={<CopyButton text={`${order.name}\n${formatLebanesePhone(order.phone)}\n${address}${order.landmark ? `\nLandmark: ${order.landmark}` : ''}`} />}
          >
            <address className="text-[13px] not-italic leading-5 text-[#303030]">
              {order.name}
              <br />
              {order.addressLine}
              <br />
              {order.town}, {district}
              <br />
              {governorateName(order.governorate as GovernorateId, 'en')}
              <br />
              {formatLebanesePhone(order.phone)}
            </address>
            {order.landmark && <p className="mt-2 text-[13px] text-[#616161]">Landmark: {order.landmark}</p>}
          </AdminCard>
        </div>
      </div>
    </>
  );
}
