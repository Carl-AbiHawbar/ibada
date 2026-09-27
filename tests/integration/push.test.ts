import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createTestDb, type TestDb } from '../helpers/db';
import { insertStaff } from '../helpers/orders';
import { pushSubscriptions } from '@/server/db/schema';
import {
  listSubscriptions,
  newOrderPayload,
  notifyAdmins,
  removeSubscription,
  saveSubscription,
  sendToUser,
  type PushSender,
} from '@/server/push';

let t: TestDb;
let ownerId: string;
let staffId: string;
let exStaffId: string;
const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: `p-${endpoint}`, auth: `a-${endpoint}` } });
const payload = { title: 'T', body: 'B', url: '/admin', tag: 'x' };

beforeEach(async () => {
  t = await createTestDb();
  ownerId = await insertStaff(t.db, { name: 'Owner' });
  staffId = await insertStaff(t.db, { name: 'Staff', role: 'staff' });
  exStaffId = await insertStaff(t.db, { name: 'Ex', role: 'staff', active: false });
  await saveSubscription(t.db, ownerId, sub('a'), 'iPhone');
  await saveSubscription(t.db, staffId, sub('b'), 'Android');
  await saveSubscription(t.db, exStaffId, sub('c'), 'Old phone');
});
afterEach(() => t.close());

it('formats the new-order notification', () => {
  expect(
    newOrderPayload({
      id: 'o1',
      number: 1042,
      items: [{ bundleName: 'Multi-Room Protection', quantity: 1 }],
      totalCents: 3600,
      district: 'Beirut',
    }),
  ).toEqual({ title: '🛒 New order #1042', body: 'Multi-Room Protection ×1 · $36 · Beirut', url: '/admin/orders/o1', tag: 'order-o1' });
  expect(
    newOrderPayload({
      id: 'o2',
      number: 1043,
      items: [
        { bundleName: 'Family Pack', quantity: 1 },
        { bundleName: 'Single Room Protection', quantity: 2 },
      ],
      totalCents: 9100,
      district: 'Metn',
    }).body,
  ).toBe('Family Pack ×1, Single Room Protection ×2 · $91 · Metn');
});

it('sends to active admins only and removes dead subscriptions', async () => {
  const send = vi.fn<PushSender>(async (s) => ({ statusCode: s.endpoint === 'b' ? 410 : 201 }));
  expect(await notifyAdmins(t.db, payload, send)).toEqual({ sent: 1, removed: 1, failed: 0 });
  expect(send.mock.calls.map((c) => c[0].endpoint).sort()).toEqual(['a', 'b']);
  expect(JSON.parse(send.mock.calls[0]![1])).toEqual(payload);
  expect((await t.db.select().from(pushSubscriptions)).map((s) => s.endpoint).sort()).toEqual(['a', 'c']);
  const [a] = await listSubscriptions(t.db, ownerId);
  expect(a!.lastSuccessAt).not.toBeNull();
});

it('keeps subscriptions when sending throws', async () => {
  const send = vi.fn<PushSender>().mockRejectedValue(new Error('network'));
  expect(await notifyAdmins(t.db, payload, send)).toEqual({ sent: 0, removed: 0, failed: 2 });
  expect(await t.db.select().from(pushSubscriptions)).toHaveLength(3);
});

it('a device endpoint belongs to whoever subscribed last; removal is scoped to its owner', async () => {
  await saveSubscription(t.db, staffId, sub('a'), 'Shared iPad');
  await removeSubscription(t.db, ownerId, 'a');
  expect((await listSubscriptions(t.db, staffId)).map((s) => s.endpoint).sort()).toEqual(['a', 'b']);
  expect(await listSubscriptions(t.db, ownerId)).toEqual([]);
  await removeSubscription(t.db, staffId, 'a');
  expect((await listSubscriptions(t.db, staffId)).map((s) => s.endpoint)).toEqual(['b']);
});

it('test notification goes to one user', async () => {
  const send = vi.fn<PushSender>(async () => ({ statusCode: 201 }));
  expect(await sendToUser(t.db, ownerId, payload, send)).toEqual({ sent: 1, removed: 0, failed: 0 });
  expect(send.mock.calls.map((c) => c[0].endpoint)).toEqual(['a']);
});
