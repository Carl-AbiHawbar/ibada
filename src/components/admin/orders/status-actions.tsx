'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { changeStatusAction } from '@/app/admin/(dashboard)/orders/actions';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { AdminButton } from '@/components/admin/ui';
import { nextStatuses, type OrderStatus } from '@/lib/order-status';

const LABELS: Record<OrderStatus, string> = {
  new: 'Mark new',
  confirmed: 'Confirm order',
  out_for_delivery: 'Mark out for delivery',
  delivered: 'Mark delivered (cash collected)',
  cancelled: 'Cancel order',
  returned: 'Mark returned',
};

const ERRORS: Record<string, string> = {
  conflict: 'This order was just changed by someone else. The page has been refreshed.',
  invalid_transition: "That status change isn't allowed.",
  not_found: 'This order no longer exists.',
};

export function StatusActions({ orderId, status, number }: { orderId: string; status: OrderStatus; number: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<OrderStatus | null>(null);
  const options = nextStatuses(status);

  const apply = (to: OrderStatus) =>
    start(async () => {
      const r = await changeStatusAction({ orderId, to });
      setConfirm(null);
      if (!r.ok) toast.error(ERRORS[r.error] ?? 'Could not update the order.');
      router.refresh();
    });

  if (options.length === 0) return <p className="text-sm text-slate-500">No further steps for this order.</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((to) => {
        const destructive = to === 'cancelled' || to === 'returned';
        return (
          <AdminButton
            key={to}
            variant={destructive ? 'secondary' : 'primary'}
            className={destructive ? 'text-red-600' : undefined}
            disabled={pending}
            onClick={() => (destructive ? setConfirm(to) : apply(to))}
          >
            {LABELS[to]}
          </AdminButton>
        );
      })}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === 'returned' ? `Mark order #${number} as returned?` : `Cancel order #${number}?`}
        description={
          confirm === 'returned'
            ? 'The devices will be put back in stock and the sale removed from revenue.'
            : 'The devices will be put back in stock and any discount code released. This cannot be undone.'
        }
        confirmLabel={confirm ? LABELS[confirm] : ''}
        danger
        busy={pending}
        onConfirm={() => confirm && apply(confirm)}
      />
    </div>
  );
}
