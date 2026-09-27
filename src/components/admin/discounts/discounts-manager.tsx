'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { saveDiscountAction, toggleDiscountAction, type DiscountFormValues } from '@/app/admin/(dashboard)/discounts/actions';
import { AsyncSwitch } from '@/components/admin/async-switch';
import { AdminButton, AdminField, AdminInput, AdminSelect } from '@/components/admin/ui';
import { formatUsd } from '@/lib/money';
import { cn } from '@/lib/utils';

export type DiscountRow = {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotalCents: number | null;
  usageLimit: number | null;
  usedCount: number;
  oncePerPhone: boolean;
  startsOn: string;
  endsOn: string;
  active: boolean;
};

const EMPTY: DiscountFormValues = {
  code: '',
  type: 'percent',
  amount: '',
  minSubtotal: '',
  usageLimit: '',
  oncePerPhone: false,
  startsOn: '',
  endsOn: '',
  active: true,
};

function toForm(d: DiscountRow): DiscountFormValues {
  return {
    code: d.code,
    type: d.type,
    amount: d.type === 'percent' ? String(d.value) : String(d.value / 100),
    minSubtotal: d.minSubtotalCents === null ? '' : String(d.minSubtotalCents / 100),
    usageLimit: d.usageLimit === null ? '' : String(d.usageLimit),
    oncePerPhone: d.oncePerPhone,
    startsOn: d.startsOn,
    endsOn: d.endsOn,
    active: d.active,
  };
}

function DiscountForm({ id, initial, onDone }: { id: string | null; initial: DiscountFormValues; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = (k: keyof DiscountFormValues) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await saveDiscountAction(id, v);
      if (!r.ok) return setErrors(r.fieldErrors);
      toast.success('Discount saved');
      onDone();
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-blue/30 bg-ice/40 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminField id="d-code" label="Code" error={errors.code} hint="Customers type this at checkout">
          <AdminInput id="d-code" className="uppercase" value={v.code} onChange={set('code')} maxLength={32} autoComplete="off" />
        </AdminField>
        <AdminField id="d-type" label="Type">
          <AdminSelect id="d-type" value={v.type} onChange={set('type')}>
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed amount off (USD)</option>
          </AdminSelect>
        </AdminField>
        <AdminField id="d-amount" label="Amount" error={errors.amount} hint={v.type === 'percent' ? 'e.g. 10 for 10%' : 'e.g. 5 for $5 off'}>
          <AdminInput id="d-amount" type="number" min={0} step={v.type === 'percent' ? 1 : 0.01} value={v.amount} onChange={set('amount')} />
        </AdminField>
        <AdminField id="d-min" label="Minimum order (USD)" error={errors.minSubtotal} hint="Optional">
          <AdminInput id="d-min" type="number" min={0} step={0.01} value={v.minSubtotal} onChange={set('minSubtotal')} />
        </AdminField>
        <AdminField id="d-limit" label="Total uses allowed" error={errors.usageLimit} hint="Optional">
          <AdminInput id="d-limit" type="number" min={1} value={v.usageLimit} onChange={set('usageLimit')} />
        </AdminField>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm font-medium text-navy">
            <input type="checkbox" className="size-4 accent-navy" checked={v.oncePerPhone} onChange={(e) => setV((s) => ({ ...s, oncePerPhone: e.target.checked }))} />
            Once per phone number
          </label>
        </div>
        <AdminField id="d-start" label="Starts" error={errors.startsOn} hint="Optional">
          <AdminInput id="d-start" type="date" value={v.startsOn} onChange={set('startsOn')} />
        </AdminField>
        <AdminField id="d-end" label="Ends (inclusive)" error={errors.endsOn} hint="Optional">
          <AdminInput id="d-end" type="date" value={v.endsOn} onChange={set('endsOn')} />
        </AdminField>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm font-medium text-navy">
            <input type="checkbox" className="size-4 accent-navy" checked={v.active} onChange={(e) => setV((s) => ({ ...s, active: e.target.checked }))} />
            Active
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <AdminButton type="submit" disabled={pending}>
          Save discount
        </AdminButton>
        <AdminButton type="button" variant="ghost" onClick={onDone}>
          Cancel
        </AdminButton>
      </div>
    </form>
  );
}

export function DiscountsManager({ rows }: { rows: DiscountRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  return (
    <div className="space-y-4">
      {editing === null && (
        <AdminButton onClick={() => setEditing('new')}>
          <Plus /> New discount
        </AdminButton>
      )}
      {editing === 'new' && <DiscountForm id={null} initial={EMPTY} onDone={() => setEditing(null)} />}
      <ul className="space-y-3">
        {rows.map((d) =>
          editing === d.id ? (
            <li key={d.id}>
              <DiscountForm id={d.id} initial={toForm(d)} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={d.id} data-testid="discount-row" className={cn('flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4', !d.active && 'opacity-60')}>
              <span className="rounded-lg bg-ice px-2.5 py-1 font-mono text-sm font-bold text-navy">{d.code}</span>
              <span className="font-semibold text-navy">{d.type === 'percent' ? `${d.value}%` : `${formatUsd(d.value)} off`}</span>
              <span className="text-sm text-slate-500">
                {d.usageLimit ? `${d.usedCount} / ${d.usageLimit} used` : `${d.usedCount} used`}
                {d.minSubtotalCents ? ` · min ${formatUsd(d.minSubtotalCents)}` : ''}
                {d.oncePerPhone ? ' · once per phone' : ''}
                {d.startsOn || d.endsOn ? ` · ${d.startsOn || '…'} → ${d.endsOn || '…'}` : ''}
              </span>
              <AsyncSwitch
                className="ms-auto"
                checked={d.active}
                label="Active"
                ariaLabel={`${d.code} active`}
                onChange={async (next) => {
                  await toggleDiscountAction(d.id, next);
                  router.refresh();
                  return true;
                }}
              />
              <AdminButton size="sm" variant="secondary" onClick={() => setEditing(d.id)} disabled={editing !== null}>
                Edit
              </AdminButton>
            </li>
          ),
        )}
        {rows.length === 0 && editing !== 'new' && <li className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">No discount codes yet.</li>}
      </ul>
    </div>
  );
}
