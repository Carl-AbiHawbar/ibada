import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { BarList } from '@/components/admin/dashboard/bar-list';
import { RangePicker } from '@/components/admin/dashboard/range-picker';
import { SalesChart } from '@/components/admin/dashboard/sales-chart';
import { StatusBadge } from '@/components/admin/orders/status-badge';
import { PageHeader } from '@/components/admin/page-header';
import { AdminCard } from '@/components/admin/ui';
import { parseDashboardRange } from '@/lib/dashboard-range';
import { beirutDateKey, formatBeirut } from '@/lib/dates';
import { governorateName, type GovernorateId } from '@/lib/lebanon';
import { formatUsd } from '@/lib/money';
import { dashboardSummary, funnel, lowStock, ordersByGovernorate, salesSeries, topBundles } from '@/server/analytics';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { listOrders } from '@/server/orders/admin-query';

export const metadata: Metadata = { title: 'Home' };

function Stat({ label, value, sub, testId }: { label: string; value: string; sub?: string; testId?: string }) {
  return (
    <div data-testid={testId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-navy sm:text-3xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export default async function AdminHome({ searchParams }: PageProps<'/admin'>) {
  const { user } = await requireAdmin('home');
  const range = parseDashboardRange(await searchParams);
  const db = getDb();
  const [summary, series, steps, bundles, governorates, latest, low] = await Promise.all([
    dashboardSummary(db, range),
    salesSeries(db, range),
    funnel(db, range),
    topBundles(db, range),
    ordersByGovernorate(db, range),
    listOrders(db, { page: 1 }),
    lowStock(db),
  ]);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

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

      {low.length > 0 && (
        <Link href="/admin/inventory" className="mb-5 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 hover:bg-red-100">
          <AlertTriangle className="size-5 shrink-0" />
          <span className="flex-1">
            <strong>Low stock:</strong> {low.map((p) => `${p.name} (${p.stockUnits} left)`).join(', ')}
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat testId="stat-sales" label="Sales" value={formatUsd(summary.salesCents)} sub="Excludes cancelled & returned" />
        <Stat label="Orders" value={String(summary.orders)} />
        <Stat label="Average order" value={formatUsd(summary.aovCents)} />
        <Stat label="Cash collected" value={formatUsd(summary.collectedCents)} sub={`${formatUsd(summary.pendingCents)} still to collect`} />
      </div>

      <AdminCard className="mt-5" title="Sales per day">
        <SalesChart data={series} />
      </AdminCard>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
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
          <p className="mt-4 text-sm text-slate-600">
            Conversion: <strong className="text-navy">{steps.conversionPct}%</strong> of visitors ordered
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
          title="Latest orders"
          actions={
            <Link href="/admin/orders" className="text-sm font-semibold text-blue hover:underline">
              View all
            </Link>
          }
        >
          <ul data-testid="latest-orders" className="divide-y divide-slate-100">
            {latest.rows.slice(0, 10).map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:bg-slate-50">
                  <span className="font-bold text-navy">#{o.number}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{o.name}</span>
                  <StatusBadge status={o.status} />
                  <span className="w-14 text-end font-semibold tabular-nums text-navy">{formatUsd(o.totalCents)}</span>
                  <span className="hidden w-32 text-end text-xs text-slate-500 sm:block">{formatBeirut(new Date(o.createdAt), 'datetime')}</span>
                </Link>
              </li>
            ))}
            {latest.rows.length === 0 && <li className="py-6 text-center text-sm text-slate-500">No orders yet.</li>}
          </ul>
        </AdminCard>
      </div>
    </>
  );
}
