'use server';

import { revalidatePath } from 'next/cache';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { ORDER_STATUSES, STATUS_LABELS } from '@/lib/order-status';
import { audit } from '@/server/audit';
import { getDb } from '@/server/db/client';
import { orders } from '@/server/db/schema';
import { requireAdmin } from '@/server/next/admin-session';
import { invalidate, TAGS } from '@/server/next/cache';
import { requestIp } from '@/server/next/request';
import { addOrderNote, bulkChangeStatus, changeOrderStatus } from '@/server/orders/manage';

const changeSchema = z.object({ orderId: z.uuid(), to: z.enum(ORDER_STATUSES), note: z.string().max(1000).optional() });

export async function changeStatusAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await requireAdmin('orders');
  const parsed = changeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const db = getDb();
  const [before] = await db.select({ number: orders.number, status: orders.status }).from(orders).where(eq(orders.id, parsed.data.orderId));
  const r = await changeOrderStatus(db, { ...parsed.data, userId: user.id, now: new Date() });
  if (!r.ok) return r;
  if (r.stockCrossedZero) invalidate(TAGS.catalog);
  await audit(db, {
    userId: user.id,
    action: 'order.status_changed',
    entity: 'order',
    entityId: parsed.data.orderId,
    summary: `#${before?.number} ${STATUS_LABELS[before!.status]} → ${STATUS_LABELS[parsed.data.to]}`,
    ip: await requestIp(),
  });
  revalidatePath('/admin/orders', 'layout');
  return { ok: true };
}

const bulkSchema = z.object({
  orderIds: z.array(z.uuid()).min(1).max(100),
  to: z.enum(['confirmed', 'out_for_delivery', 'delivered']),
});

export async function bulkStatusAction(input: unknown): Promise<{ updated: number; skipped: number }> {
  const { user } = await requireAdmin('orders');
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { updated: 0, skipped: 0 };
  const db = getDb();
  const r = await bulkChangeStatus(db, { ...parsed.data, userId: user.id, now: new Date() });
  if (r.stockCrossedZero) invalidate(TAGS.catalog);
  if (r.updated > 0) {
    const nums = await db.select({ number: orders.number }).from(orders).where(inArray(orders.id, parsed.data.orderIds));
    await audit(db, {
      userId: user.id,
      action: 'order.bulk_status_changed',
      entity: 'order',
      summary: `${r.updated} order(s) → ${STATUS_LABELS[parsed.data.to]}: ${nums.map((n) => `#${n.number}`).join(', ')}`,
      ip: await requestIp(),
    });
  }
  revalidatePath('/admin/orders', 'layout');
  return { updated: r.updated, skipped: r.skipped };
}

const noteSchema = z.object({ orderId: z.uuid(), note: z.string().trim().min(1).max(1000) });

export async function addNoteAction(input: unknown): Promise<{ ok: boolean }> {
  const { user } = await requireAdmin('orders');
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  await addOrderNote(getDb(), { ...parsed.data, userId: user.id });
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { ok: true };
}
