import { and, eq } from 'drizzle-orm';
import webpush from 'web-push';
import { getEnv } from '@/env';
import { formatUsd } from '@/lib/money';
import type { Db } from './db/client';
import { pushSubscriptions, user } from './db/schema';
import type { NewOrderNotice } from './orders/place-order';

export type PushPayload = { title: string; body: string; url: string; tag: string };
export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };
export type PushSender = (sub: PushSubscriptionInput, payload: string) => Promise<{ statusCode: number }>;
export type PushResult = { sent: number; removed: number; failed: number };

export function newOrderPayload(n: NewOrderNotice): PushPayload {
  const items = n.items.map((i) => `${i.bundleName} ×${i.quantity}`).join(', ');
  return {
    title: `🛒 New order #${n.number}`,
    body: `${items} · ${formatUsd(n.totalCents)} · ${n.district}`,
    url: `/admin/orders/${n.id}`,
    tag: `order-${n.id}`,
  };
}

let vapidConfigured = false;

/** Real sender via the Web Push protocol; configured lazily so tests never need VAPID keys. */
export const webPushSender: PushSender = async (sub, payload) => {
  if (!vapidConfigured) {
    const env = getEnv();
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) throw new Error('VAPID keys are not configured');
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  }
  try {
    const res = await webpush.sendNotification(sub, payload, { TTL: 3600, urgency: 'high' });
    return { statusCode: res.statusCode };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) return { statusCode };
    throw err;
  }
};

export async function saveSubscription(
  db: Db,
  userId: string,
  sub: PushSubscriptionInput,
  userAgent: string | null,
): Promise<void> {
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent, updatedAt: new Date() },
    });
}

export async function removeSubscription(db: Db, userId: string, endpoint: string): Promise<void> {
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

export async function listSubscriptions(db: Db, userId: string) {
  const rows = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  return rows.map((r) => ({
    endpoint: r.endpoint,
    userAgent: r.userAgent,
    createdAt: r.createdAt.toISOString(),
    lastSuccessAt: r.lastSuccessAt?.toISOString() ?? null,
  }));
}

async function deliver(
  db: Db,
  subs: (typeof pushSubscriptions.$inferSelect)[],
  payload: PushPayload,
  send: PushSender,
): Promise<PushResult> {
  const body = JSON.stringify(payload);
  const result: PushResult = { sent: 0, removed: 0, failed: 0 };
  await Promise.all(
    subs.map(async (s) => {
      try {
        const { statusCode } = await send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
        if (statusCode === 404 || statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
          result.removed += 1;
        } else if (statusCode >= 200 && statusCode < 300) {
          await db.update(pushSubscriptions).set({ lastSuccessAt: new Date() }).where(eq(pushSubscriptions.id, s.id));
          result.sent += 1;
        } else {
          result.failed += 1;
        }
      } catch (err) {
        console.error('Push delivery failed', err);
        result.failed += 1;
      }
    }),
  );
  return result;
}

/** Notify every device of every active admin. */
export async function notifyAdmins(db: Db, payload: PushPayload, send: PushSender = webPushSender): Promise<PushResult> {
  const rows = await db
    .select({ sub: pushSubscriptions })
    .from(pushSubscriptions)
    .innerJoin(user, eq(user.id, pushSubscriptions.userId))
    .where(eq(user.active, true));
  return deliver(
    db,
    rows.map((r) => r.sub),
    payload,
    send,
  );
}

/** Notify every device of one admin (the "send test notification" button). */
export async function sendToUser(
  db: Db,
  userId: string,
  payload: PushPayload,
  send: PushSender = webPushSender,
): Promise<PushResult> {
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  return deliver(db, subs, payload, send);
}
