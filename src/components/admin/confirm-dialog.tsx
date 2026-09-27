'use client';

import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminButton } from './ui';

/** Controlled "are you sure?" dialog for destructive admin actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  danger = false,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white p-6 sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-navy">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-600">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AdminButton variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Keep it
          </AdminButton>
          <AdminButton variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </AdminButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
