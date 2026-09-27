'use client';

import { useTransition } from 'react';
import { unsubscribeAction } from '@/app/admin/(dashboard)/notifications/actions';
import { AdminButton } from '@/components/admin/ui';

export function RemoveDeviceButton({ endpoint }: { endpoint: string }) {
  const [pending, start] = useTransition();
  return (
    <AdminButton size="sm" variant="ghost" disabled={pending} onClick={() => start(() => unsubscribeAction(endpoint))}>
      Remove
    </AdminButton>
  );
}
