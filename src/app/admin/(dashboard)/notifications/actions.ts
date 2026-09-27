'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { audit } from '@/server/audit';
import { getDb } from '@/server/db/client';
import { requireAdmin } from '@/server/next/admin-session';
import { requestIp } from '@/server/next/request';
import { removeSubscription, saveSubscription, sendToUser } from '@/server/push';

const subscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2048),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function subscribeAction(input: unknown): Promise<{ ok: boolean }> {
  const { user } = await requireAdmin('notifications');
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const db = getDb();
  const ua = (await headers()).get('user-agent')?.slice(0, 300) ?? null;
  await saveSubscription(db, user.id, parsed.data, ua);
  await audit(db, { userId: user.id, action: 'push.subscribed', entity: 'user', entityId: user.id, summary: 'Enabled notifications on a device', ip: await requestIp() });
  revalidatePath('/admin/notifications');
  return { ok: true };
}

export async function unsubscribeAction(endpoint: string): Promise<void> {
  const { user } = await requireAdmin('notifications');
  const parsed = z.string().max(2048).safeParse(endpoint);
  if (!parsed.success) return;
  await removeSubscription(getDb(), user.id, parsed.data);
  revalidatePath('/admin/notifications');
}

export async function sendTestAction(): Promise<{ sent: number; failed: number }> {
  const { user } = await requireAdmin('notifications');
  const r = await sendToUser(getDb(), user.id, { title: 'IBADA', body: 'Notifications are working ✅', url: '/admin', tag: 'test' });
  revalidatePath('/admin/notifications');
  return { sent: r.sent, failed: r.failed };
}
