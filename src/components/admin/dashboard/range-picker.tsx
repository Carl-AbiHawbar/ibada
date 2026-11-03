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
      <div className="flex gap-0.5 rounded-lg bg-white p-0.5 shadow-[0_0_0_1px_rgba(0,0,0,0.12),inset_0_-1px_0_rgba(0,0,0,0.12)]" role="group" aria-label="Date range">
        {PRESETS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin?range=${key}`}
            aria-current={current === key ? 'true' : undefined}
            onClick={() => setCustom(false)}
            className={cn('rounded-md px-2.5 py-1 text-[13px] font-medium', current === key ? 'bg-[#e3e3e3] font-semibold text-[#303030]' : 'text-[#616161] hover:bg-black/5 hover:text-[#303030]')}
          >
            {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setCustom((c) => !c)}
          className={cn('rounded-md px-2.5 py-1 text-[13px] font-medium', current === 'custom' ? 'bg-[#e3e3e3] font-semibold text-[#303030]' : 'text-[#616161] hover:bg-black/5 hover:text-[#303030]')}
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
          <AdminInput type="date" aria-label="Start date" className="w-40" value={f} onChange={(e) => setF(e.target.value)} />
          <span className="text-[#8a8a8a]">→</span>
          <AdminInput type="date" aria-label="End date" className="w-40" value={t} onChange={(e) => setT(e.target.value)} />
          <AdminButton size="sm" type="submit">
            Apply
          </AdminButton>
        </form>
      )}
    </div>
  );
}
