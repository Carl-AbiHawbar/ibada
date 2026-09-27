'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminButton, AdminInput } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

const PRESETS = [
  ['today', 'Today'],
  ['7d', '7 days'],
  ['30d', '30 days'],
] as const;

export function RangePicker({ current, from, to }: { current: string; from: string; to: string }) {
  const router = useRouter();
  const [custom, setCustom] = useState(current === 'custom');
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200" role="group" aria-label="Date range">
        {PRESETS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin?range=${key}`}
            aria-current={current === key ? 'true' : undefined}
            onClick={() => setCustom(false)}
            className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', current === key ? 'bg-navy text-white' : 'text-slate-600 hover:text-navy')}
          >
            {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setCustom((c) => !c)}
          className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', current === 'custom' ? 'bg-navy text-white' : 'text-slate-600 hover:text-navy')}
        >
          Custom
        </button>
      </div>
      {custom && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (f && t) router.push(`/admin?from=${f}&to=${t}`);
          }}
        >
          <AdminInput type="date" aria-label="Start date" className="h-9 w-40" value={f} onChange={(e) => setF(e.target.value)} />
          <span className="text-slate-400">→</span>
          <AdminInput type="date" aria-label="End date" className="h-9 w-40" value={t} onChange={(e) => setT(e.target.value)} />
          <AdminButton size="sm" type="submit">
            Apply
          </AdminButton>
        </form>
      )}
    </div>
  );
}
