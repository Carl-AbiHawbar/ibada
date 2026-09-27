'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { addNoteAction } from '@/app/admin/(dashboard)/orders/actions';
import { AdminButton, AdminTextarea } from '@/components/admin/ui';

export function NoteForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    start(async () => {
      const r = await addNoteAction({ orderId, note });
      if (r.ok) {
        setNote('');
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="note" className="block text-sm font-semibold text-navy">
        Add a note
      </label>
      <AdminTextarea id="note" rows={2} maxLength={1000} placeholder="Only visible to staff" value={note} onChange={(e) => setNote(e.target.value)} />
      <AdminButton type="submit" size="sm" variant="secondary" disabled={pending || !note.trim()}>
        Save note
      </AdminButton>
    </form>
  );
}
