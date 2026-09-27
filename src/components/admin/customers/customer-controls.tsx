'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { setBlockedAction, setNotesAction } from '@/app/admin/(dashboard)/customers/actions';
import { AdminButton, AdminField, AdminInput, AdminTextarea } from '@/components/admin/ui';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function BlockControls({ customerId, blocked }: { customerId: string; blocked: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  const apply = (value: boolean) =>
    start(async () => {
      await setBlockedAction(customerId, value, reason);
      setOpen(false);
      setReason('');
      toast.success(value ? 'Customer blocked' : 'Customer unblocked');
      router.refresh();
    });

  if (blocked) {
    return (
      <AdminButton variant="secondary" disabled={pending} onClick={() => apply(false)}>
        Unblock
      </AdminButton>
    );
  }
  return (
    <>
      <AdminButton variant="secondary" className="text-red-600" onClick={() => setOpen(true)}>
        Block customer
      </AdminButton>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="bg-white p-6 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-navy">Block this phone number?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              They won&apos;t be able to place new orders. Use this for repeated fake orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AdminField id="block-reason" label="Reason">
            <AdminInput id="block-reason" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. 3 fake orders" />
          </AdminField>
          <AlertDialogFooter className="gap-2">
            <AdminButton variant="secondary" onClick={() => setOpen(false)}>
              Keep
            </AdminButton>
            <AdminButton variant="danger" disabled={pending} onClick={() => apply(true)}>
              Block
            </AdminButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function NotesForm({ customerId, initial }: { customerId: string; initial: string }) {
  const [notes, setNotes] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await setNotesAction(customerId, notes);
          toast.success('Notes saved');
        });
      }}
      className="space-y-2"
    >
      <AdminTextarea aria-label="Notes" rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only visible to staff" />
      <AdminButton type="submit" size="sm" variant="secondary" disabled={pending}>
        Save notes
      </AdminButton>
    </form>
  );
}
