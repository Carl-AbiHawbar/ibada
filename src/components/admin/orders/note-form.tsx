'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { addNoteAction } from '@/app/admin/(dashboard)/orders/actions';
import { AdminButton, AdminTextarea, cardClass } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

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
    <form onSubmit={submit} className={cn(cardClass, 'overflow-hidden')}>
      <label htmlFor="note" className="sr-only">
        Add a note
      </label>
      <AdminTextarea
        id="note"
        rows={2}
        maxLength={1000}
        placeholder="Add a note… (only visible to staff)"
        className="min-h-16 rounded-none border-0 hover:border-0 focus:ring-0"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end border-t border-[#ebebeb] bg-[#f7f7f7] px-3 py-2">
        <AdminButton type="submit" size="sm" variant="secondary" disabled={pending || !note.trim()}>
          Save note
        </AdminButton>
      </div>
    </form>
  );
}
