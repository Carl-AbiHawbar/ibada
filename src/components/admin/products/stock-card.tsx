'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adjustStockAction } from '@/app/admin/(dashboard)/products/actions';
import { AdminButton, AdminField, AdminInput } from '@/components/admin/ui';

const ERRORS: Record<string, string> = {
  note_required: 'Add a reason so the history makes sense later.',
  negative_stock: "Stock can't go below zero.",
  not_found: 'This product no longer exists.',
};

export function StockAdjustForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = Math.trunc(Number(delta));
    if (!n) return toast.error('Enter how many devices to add (e.g. 50) or remove (e.g. -3).');
    start(async () => {
      const r = await adjustStockAction(productId, n, note);
      if (!r.ok) return void toast.error(ERRORS[r.error] ?? 'Could not update stock.');
      setDelta('');
      setNote('');
      toast.success('Stock updated');
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <AdminField id={`delta-${productId}`} label="Change (+/−)" className="w-32">
        <AdminInput id={`delta-${productId}`} type="number" inputMode="numeric" placeholder="+50" value={delta} onChange={(e) => setDelta(e.target.value)} />
      </AdminField>
      <AdminField id={`note-${productId}`} label="Reason" className="min-w-48 flex-1">
        <AdminInput id={`note-${productId}`} placeholder="New shipment, recount, damaged…" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </AdminField>
      <AdminButton type="submit" disabled={pending}>
        Apply
      </AdminButton>
    </form>
  );
}
