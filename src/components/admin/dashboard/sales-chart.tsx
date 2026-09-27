'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatUsd } from '@/lib/money';

type Point = { date: string; salesCents: number; orders: number };

const BLUE = '#0693E6';
const GRID = '#E2E8F0';
const MUTED = '#64748B';

const dayLabel = (key: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${key}T00:00:00Z`));

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const p = active ? payload?.[0]?.payload : undefined;
  if (!p) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-navy">{dayLabel(p.date)}</p>
      <p className="text-ink">{formatUsd(p.salesCents)} sales</p>
      <p className="text-slate-500">
        {p.orders} order{p.orders === 1 ? '' : 's'}
      </p>
    </div>
  );
}

/** Sales per Beirut day: one series (no legend; the card title names it), hover for the exact values. */
export function SalesChart({ data }: { data: Point[] }) {
  return (
    <div>
      <div className="h-64 w-full" role="img" aria-label="Sales per day chart. Exact values are in the table below.">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BLUE} stopOpacity={0.16} />
                <stop offset="100%" stopColor={BLUE} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID} strokeWidth={1} />
            <XAxis
              dataKey="date"
              tickFormatter={dayLabel}
              tick={{ fill: MUTED, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis
              tickFormatter={(c: number) => formatUsd(Math.round(c / 100) * 100)}
              tick={{ fill: MUTED, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: MUTED, strokeWidth: 1 }} />
            <Area
              type="linear"
              dataKey="salesCents"
              stroke={BLUE}
              strokeWidth={2}
              fill="url(#salesFill)"
              dot={false}
              activeDot={{ r: 5, fill: BLUE, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-blue">Show as table</summary>
        <table className="mt-2 w-full text-start">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1 text-start">Day</th>
              <th className="py-1 text-end">Sales</th>
              <th className="py-1 text-end">Orders</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date} className="border-t border-slate-100">
                <td className="py-1">{dayLabel(d.date)}</td>
                <td className="py-1 text-end tabular-nums">{formatUsd(d.salesCents)}</td>
                <td className="py-1 text-end tabular-nums">{d.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
