import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { StockAdjustForm } from '@/components/admin/products/stock-card';
import { AdminCard } from '@/components/admin/ui';
import { formatBeirut } from '@/lib/dates';
import { listMovements, listProductsAdmin } from '@/server/admin/products';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';

export const metadata: Metadata = { title: 'Inventory' };

const REASON: Record<string, string> = { order: 'Order', cancel: 'Cancelled order', return: 'Returned', manual: 'Manual', initial: 'Initial stock' };

export default async function InventoryPage() {
  await requireAdmin('inventory');
  const db = getDb();
  const products = await listProductsAdmin(db);
  const history = await Promise.all(products.map((p) => listMovements(db, p.id, 1)));

  return (
    <>
      <PageHeader title="Inventory" description="Stock is counted in single devices; a 4-pack uses 4." />
      <div className="space-y-5">
        {products.map((p, i) => {
          const low = p.stockUnits <= p.lowStockThreshold;
          return (
            <AdminCard key={p.id} className="space-y-5" title={<Link href={`/admin/products/${p.id}`} className="hover:underline">{p.nameEn}</Link>}>
              <div data-testid="stock-card" className="space-y-5">
                <span className="sr-only">{p.nameEn}</span>
                <div className="flex flex-wrap items-center gap-3">
                  <span data-testid="stock-units" className={`text-4xl font-extrabold ${low ? 'text-red-600' : 'text-navy'}`}>
                    {p.stockUnits}
                  </span>
                  <span className="text-sm text-slate-500">devices in stock · alert at {p.lowStockThreshold}</span>
                  {low && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                      <AlertTriangle className="size-3.5" /> Low stock
                    </span>
                  )}
                </div>
                <StockAdjustForm productId={p.id} />
                <div>
                  <h3 className="mb-2 text-sm font-bold text-navy">History</h3>
                  <ul data-testid="movements" className="divide-y divide-slate-100 text-sm">
                    {history[i]!.rows.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2">
                        <span className={`w-14 font-bold tabular-nums ${m.deltaUnits > 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {m.deltaUnits > 0 ? `+${m.deltaUnits}` : m.deltaUnits}
                        </span>
                        <span className="font-medium text-navy">{REASON[m.reason]}</span>
                        {m.note && <span className="text-slate-600">· {m.note}</span>}
                        <span className="ms-auto text-xs text-slate-500">
                          {formatBeirut(m.createdAt, 'datetime')}
                          {m.actorName ? ` · ${m.actorName}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AdminCard>
          );
        })}
      </div>
    </>
  );
}
