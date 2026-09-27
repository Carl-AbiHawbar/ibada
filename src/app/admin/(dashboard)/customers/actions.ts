'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { setCustomerBlocked, setCustomerNotes } from '@/server/admin/customers';
import { audit } from '@/server/audit';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { requestIp } from '@/server/next/request';

const id = z.uuid();

export async function setBlockedAction(customerId: string, blocked: boolean, reason = ''): Promise<void> {
  const { user } = await requireAdmin('customers');
  if (!id.safeParse(customerId).success) return;
  await setCustomerBlocked(getDb(), { id: customerId, blocked: Boolean(blocked), reason: String(reason) });
  await audit(getDb(), {
    userId: user.id,
    action: blocked ? 'customer.blocked' : 'customer.unblocked',
    entity: 'customer',
    entityId: customerId,
    summary: blocked ? `Blocked customer${reason ? `: ${String(reason).slice(0, 100)}` : ''}` : 'Unblocked customer',
    ip: await requestIp(),
  });
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath('/admin/customers');
}

export async function setNotesAction(customerId: string, notes: string): Promise<void> {
  await requireAdmin('customers');
  if (!id.safeParse(customerId).success) return;
  await setCustomerNotes(getDb(), { id: customerId, notes: String(notes) });
  revalidatePath(`/admin/customers/${customerId}`);
}
