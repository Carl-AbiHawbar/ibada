import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, Banknote, ChevronRight, CircleCheck, Inbox, Truck, type LucideIcon } from 'lucide-react';
import { BarList } from '@/components/admin/dashboard/bar-list';
import { RangePicker } from '@/components/admin/dashboard/range-picker';
import { SalesChart } from '@/components/admin/dashboard/sales-chart';
import { StatusBadge } from '@/components/admin/orders/status-badge';
import { PageHeader } from '@/components/admin/page-header';
import { AdminCard, cardClass } from '@/components/admin/ui';
import { parseDashboardRange } from '@/lib/dashboard-range';
import { beirutDateKey, formatBeirut } from '@/lib/dates';
import { governorateName, type GovernorateId } from '@/lib/lebanon';
import { formatUsd } from '@/lib/money';
import { can } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { dashboardSummary, funnel, lowStock, ordersByGovernorate, salesSeries, topBundles } from '@/server/analytics';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { listOrders, orderStatusCounts } from '@/server/orders/admin-query';

export const metadata: Metadata = { title: 'Home' };

function Stat({ label, value, sub, testId, className }: { label: string; value: string; sub?: string; testId?: string; className?: string }) {
  return (
    <div data-testid={testId} className={cn('border-[#ebebeb] p-4', className)}>
      <p className="text-[13px] font-medium text-[#616161] underline decoration-[#b5b5b5] decoration-dotted underline-offset-4">{label}</p>
      <p className="mt-1.5 text-xl font-bold tabular-nums text-[#303030]">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#616161]">{sub}</p>}
    </div>
  );
}

function Todo({ href, icon: Icon, children, tone = 'neutral' }: { href: string; icon: LucideIcon; children: ReactNode; tone?: 'neutral' | 'critical' }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3 text-[13px] font-medium text-[#303030] hover:bg-[#f7f7f7]">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            tone === 'critical' ? 'bg-[#fedad9] text-[#8e1f0b]' : 'bg-[#f1f1f1] text-[#4a4a4a]',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="flex-1">{children}</span>
        <ChevronRight className="size-4 text-[#8a8a8a]" aria-hidden />
      </Link>
    </li>
  );
}

export default async function AdminHome({ searchParams }: PageProps<'/admin'>) {
  const { user } = await requireAdmin('home');
  const range = parseDashboardRange(await searchParams);
  const db = getDb();
  const [summary, series, steps, bundles, governorates, latest, low, counts] = await Promise.all([
    dashboardSummary(db, range),
    salesSeries(db, range),
    funnel(db, range),
    topBundles(db, range),
    ordersByGovernorate(db, range),
    listOrders(db, { page: 1 }),
    lowStock(db),
    orderStatusCounts(db),
  ]);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const showOrders = can(user.role, 'orders');
  const todos = showOrders && (counts.new > 0 || counts.confirmed > 0 || counts.out_for_delivery > 0);

  return (
    <>
      <PageHeader
        title={`Hi, ${user.name.split(' ')[0]}`}
        description={`${range.label} · Beirut time`}
        actions={
          <RangePicker
            current={range.key}
            from={beirutDateKey(range.from)}
            to={beirutDateKey(new Date(range.to.getTime() - 1))}
          />
        }
      />

      <section className={cn(cardClass, 'grid grid-cols-2 lg:grid-cols-4')}>
        <Stat className="border-b border-e lg:border-b-0" testId="stat-sales" label="Total sales" value={formatUsd(summary.salesCents)} sub="Excludes cancelled & returned" />
        <Stat className="border-b lg:border-b-0 lg:border-e" label="Orders" value={String(summary.orders)} />
        <Stat className="border-e" label="Average order value" value={formatUsd(summary.aovCents)} />
        <Stat label="Cash collected" value={formatUsd(summary.collectedCents)} sub={`${formatUsd(summary.pendingCents)} still to collect`} />
      </section>

      <section className={cn(cardClass, 'mt-4 overflow-hidden')}>
        <h2 className="px-4 pb-1 pt-4 text-sm font-semibold">To do</h2>
        <ul className="divide-y divide-[#ebebeb]">
          {showOrders && counts.new > 0 && (
            <Todo href="/admin/orders?status=new" icon={Inbox}>
              {plural(counts.new, 'order', 'orders')} to confirm with the customer
            </Todo>
          )}
          {showOrders && counts.confirmed > 0 && (
            <Todo href="/admin/orders?status=confirmed" icon={Truck}>
              {plural(counts.confirmed, 'order', 'orders')} ready to send out
            </Todo>
          )}
          {showOrders && counts.out_for_delivery > 0 && (
            <Todo href="/admin/orders?status=out_for_delivery" icon={Banknote}>
              {plural(counts.out_for_delivery, 'order', 'orders')} out for delivery: mark delivered when the cash is collected
            </Todo>
          )}
          {low.map((p) => (
            <Todo key={p.name} href="/admin/inventory" icon={AlertTriangle} tone="critical">
              Low stock: {p.name} has {p.stockUnits} left
            </Todo>
          ))}
          {!todos && low.length === 0 && (
            <li className="flex items-center gap-3 px-4 py-3 text-[13px] text-[#616161]">
              <CircleCheck className="size-4 text-[#0c5132]" aria-hidden /> All caught up. No orders are waiting on you.
            </li>
          )}
        </ul>
      </section>

      <AdminCard className="mt-4" title="Sales per day">
        <SalesChart data={series} />
      </AdminCard>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminCard title="Visitors to orders">
          <BarList
            empty="No visits recorded yet."
            items={[
              { label: 'Viewed the product', value: steps.views, display: String(steps.views) },
              { label: 'Added to cart', value: steps.addToCart, display: String(steps.addToCart), note: pct(steps.addToCart, steps.views) },
              { label: 'Started checkout', value: steps.checkout, display: String(steps.checkout), note: pct(steps.checkout, steps.addToCart) },
              { label: 'Placed an order', value: steps.orders, display: String(steps.orders), note: pct(steps.orders, steps.checkout) },
            ].filter(() => steps.views > 0)}
          />
          <p className="mt-4 text-[13px] text-[#616161]">
            Conversion: <strong className="text-[#303030]">{steps.conversionPct}%</strong> of visitors ordered
          </p>
        </AdminCard>

        <AdminCard title="Top bundles">
          <BarList
            empty="No sales in this period."
            items={bundles.map((b) => ({ label: b.name, value: b.units, display: `${b.units} devices`, note: formatUsd(b.revenueCents) }))}
          />
        </AdminCard>

        <AdminCard title="Orders by governorate">
          <BarList
            empty="No orders in this period."
            items={governorates.map((g) => ({
              label: governorateName(g.governorate as GovernorateId, 'en'),
              value: g.orders,
              display: String(g.orders),
            }))}
          />
        </AdminCard>

        <AdminCard
          flush
          title="Latest orders"
          actions={
            <Link href="/admin/orders" className="text-[13px] font-medium text-blue hover:underline">
              View all
            </Link>
          }
        >
          <ul data-testid="latest-orders" className="mt-2 divide-y divide-[#ebebeb] border-t border-[#ebebeb]">
            {latest.rows.slice(0, 8).map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-[#f7f7f7]">
                  <span className="font-semibold">#{o.number}</span>
                  <span className="min-w-0 flex-1 truncate">{o.name}</span>
                  <StatusBadge status={o.status} />
                  <span className="w-16 text-end tabular-nums">{formatUsd(o.totalCents)}</span>
                  <span className="hidden w-28 text-end text-xs text-[#616161] sm:block">{formatBeirut(new Date(o.createdAt), 'datetime')}</span>
                </Link>
              </li>
            ))}
            {latest.rows.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-[#616161]">No orders yet.</li>}
          </ul>
        </AdminCard>
      </div>
    </>
  );
}
