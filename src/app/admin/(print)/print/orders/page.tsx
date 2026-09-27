import type { Metadata } from 'next';
import { Logo } from '@/components/brand/logo';
import { AutoPrint } from '@/components/admin/orders/auto-print';
import { formatBeirut } from '@/lib/dates';
import { districtName, governorateName, type DistrictId, type GovernorateId } from '@/lib/lebanon';
import { formatLebanesePhone } from '@/lib/phone';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { getOrderDetail, type OrderDetail } from '@/server/orders/admin-query';

export const metadata: Metadata = { title: 'Delivery slips' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function Slip({ d, label }: { d: OrderDetail; label: boolean }) {
  const o = d.order;
  return (
    <article className={`slip flex flex-col border-2 border-black p-4 text-black ${label ? 'h-[146mm] w-[96mm]' : 'h-[135mm]'}`}>
      <header className="flex items-center justify-between border-b-2 border-black pb-2">
        <Logo className="h-5" />
        <span className="text-2xl font-extrabold">#{o.number}</span>
      </header>
      <section className="mt-3 space-y-1 text-[15px]">
        <p className="text-lg font-bold">{o.name}</p>
        <p className="text-lg font-bold">{formatLebanesePhone(o.phone)}</p>
        <p>
          {o.addressLine}, {o.town}
        </p>
        <p>
          {districtName(o.district as DistrictId, 'en')} — {governorateName(o.governorate as GovernorateId, 'en')}
        </p>
        {o.landmark && <p className="font-semibold">Landmark: {o.landmark}</p>}
        {o.notes && <p className="italic">Note: {o.notes}</p>}
      </section>
      <section className="mt-3 border-t border-dashed border-black pt-2 text-sm">
        {d.items.map((i) => (
          <p key={i.id}>
            {i.quantity} × {i.bundleNameEn} ({i.unitsPerBundle * i.quantity} device{i.unitsPerBundle * i.quantity === 1 ? '' : 's'})
          </p>
        ))}
      </section>
      <footer className="mt-auto flex items-end justify-between border-t-2 border-black pt-2">
        <span className="text-xs">{formatBeirut(o.createdAt, 'datetime')}</span>
        <span className="text-2xl font-extrabold">COD amount: ${(o.totalCents / 100).toFixed(2)}</span>
      </footer>
    </article>
  );
}

export default async function PrintOrdersPage({ searchParams }: PageProps<'/admin/print/orders'>) {
  await requireAdmin('orders');
  const sp = await searchParams;
  const ids = String(sp.ids ?? '')
    .split(',')
    .filter((id) => UUID.test(id))
    .slice(0, 100);
  const label = sp.format === 'label';
  const db = getDb();
  const details = (await Promise.all(ids.map((id) => getOrderDetail(db, id)))).filter((d): d is OrderDetail => d !== null);

  return (
    <main className="bg-white p-4 print:p-0">
      <style>{label ? '@page { size: 100mm 150mm; margin: 2mm; }' : '@page { size: A4; margin: 10mm; }'}</style>
      {sp.autoprint === '1' && <AutoPrint />}
      <div className={label ? 'space-y-4 print:space-y-0 [&_.slip]:break-after-page' : 'grid gap-4 [&_.slip:nth-child(2n)]:break-after-page'}>
        {details.map((d) => (
          <Slip key={d.order.id} d={d} label={label} />
        ))}
      </div>
      {details.length === 0 && <p>No orders selected.</p>}
    </main>
  );
}
