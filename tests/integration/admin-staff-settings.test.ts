import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../helpers/db';
import { seeded } from '../helpers/fixtures';
import { insertStaff } from '../helpers/orders';
import { pushSubscriptions, session, user } from '@/server/db/schema';
import { audit, listAudit } from '@/server/audit';
import { listPendingInvites, listStaff, revokeInvite, revokeSessions, setStaffActive, setStaffRole } from '@/server/admin/staff';
import { createInvite } from '@/server/auth/invites';
import { saveSubscription } from '@/server/push';
import { getSettings, updateSettings } from '@/server/settings';

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
  await seeded(t.db);
});
afterEach(() => t.close());

const settingsInput = {
  storeName: 'IBADA',
  contactPhone: '03 123 456',
  contactEmail: 'hello@ibadashop.com',
  social: { instagram: 'https://instagram.com/ibada', facebook: '', tiktok: '' },
  announcementEn: 'Free delivery all over Lebanon',
  announcementAr: 'توصيل مجاني إلى كل لبنان',
  announcementEnabled: true,
  deliveryFeeCents: 300,
  freeDeliveryThresholdCents: 5000,
  deliveryTimeEn: 'Delivered in 2–4 business days',
  deliveryTimeAr: 'التوصيل خلال 2–4 أيام عمل',
  trustpilotUrl: '',
};

describe('settings', () => {
  it('saves and normalizes', async () => {
    expect(await updateSettings(t.db, settingsInput)).toEqual({ ok: true });
    const s = await getSettings(t.db);
    expect(s).toMatchObject({
      contactPhone: '+9613123456',
      contactEmail: 'hello@ibadashop.com',
      social: { instagram: 'https://instagram.com/ibada' },
      deliveryFeeCents: 300,
      freeDeliveryThresholdCents: 5000,
      trustpilotUrl: null,
    });
    expect(s.announcement.en).toBe('Free delivery all over Lebanon');
  });

  it('rejects bad values', async () => {
    expect(await updateSettings(t.db, { ...settingsInput, deliveryFeeCents: -1 })).toMatchObject({ ok: false, fieldErrors: { deliveryFeeCents: expect.any(String) } });
    expect(await updateSettings(t.db, { ...settingsInput, trustpilotUrl: 'https://evil.com/review/x' })).toMatchObject({
      ok: false,
      fieldErrors: { trustpilotUrl: expect.any(String) },
    });
    expect(await updateSettings(t.db, { ...settingsInput, social: { ...settingsInput.social, facebook: 'javascript:alert(1)' } })).toMatchObject({
      ok: false,
    });
    expect(await updateSettings(t.db, { ...settingsInput, contactPhone: '12' })).toMatchObject({ ok: false, fieldErrors: { contactPhone: expect.any(String) } });
    expect(await updateSettings(t.db, { ...settingsInput, trustpilotUrl: 'https://www.trustpilot.com/review/ibadashop.com' })).toEqual({ ok: true });
  });
});

describe('staff', () => {
  let ownerId: string;
  let staffId: string;
  beforeEach(async () => {
    ownerId = await insertStaff(t.db, { name: 'Owner' });
    staffId = await insertStaff(t.db, { name: 'Sara', role: 'staff' });
  });

  it('lists staff', async () => {
    expect((await listStaff(t.db)).map((u) => [u.name, u.role, u.active])).toEqual(
      expect.arrayContaining([
        ['Owner', 'owner', true],
        ['Sara', 'staff', true],
      ]),
    );
  });

  it('keeps at least one active owner', async () => {
    expect(await setStaffRole(t.db, { actorId: ownerId, userId: ownerId, role: 'staff' })).toEqual({ ok: false, error: 'last_owner' });
    expect(await setStaffActive(t.db, { actorId: ownerId, userId: ownerId, active: false })).toEqual({ ok: false, error: 'self' });
    expect(await setStaffRole(t.db, { actorId: ownerId, userId: staffId, role: 'owner' })).toEqual({ ok: true });
    expect(await setStaffRole(t.db, { actorId: staffId, userId: ownerId, role: 'staff' })).toEqual({ ok: true });
  });

  it('deactivation cuts access immediately', async () => {
    await t.db.insert(session).values({ id: 's1', token: 'tok-1', userId: staffId, expiresAt: new Date(Date.now() + 86_400_000) });
    await saveSubscription(t.db, staffId, { endpoint: 'https://push.example/1', keys: { p256dh: 'p'.repeat(20), auth: 'a'.repeat(10) } }, null);
    expect(await setStaffActive(t.db, { actorId: ownerId, userId: staffId, active: false })).toEqual({ ok: true });
    expect(await t.db.select().from(session).where(eq(session.userId, staffId))).toEqual([]);
    expect(await t.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, staffId))).toEqual([]);
    expect((await t.db.select().from(user).where(eq(user.id, staffId)))[0]!.active).toBe(false);
  });

  it('revokes sessions and invites', async () => {
    await t.db.insert(session).values({ id: 's2', token: 'tok-2', userId: ownerId, expiresAt: new Date(Date.now() + 86_400_000) });
    await revokeSessions(t.db, ownerId);
    expect(await t.db.select().from(session)).toEqual([]);

    const inv = await createInvite(t.db, { email: 'new@x.test', role: 'staff', invitedBy: ownerId });
    expect((await listPendingInvites(t.db)).map((i) => i.email)).toEqual(['new@x.test']);
    await revokeInvite(t.db, inv.id);
    expect(await listPendingInvites(t.db)).toEqual([]);
  });
});

it('lists audit rows filtered by entity', async () => {
  const ownerId = await insertStaff(t.db, { name: 'Owner' });
  await audit(t.db, { userId: ownerId, action: 'order.status_changed', entity: 'order', summary: '#1001 New → Confirmed', ip: null });
  await audit(t.db, { userId: ownerId, action: 'settings.updated', entity: 'settings', summary: 'Updated settings', ip: null });
  const all = await listAudit(t.db, { page: 1 });
  expect(all.total).toBe(2);
  const orders = await listAudit(t.db, { entity: 'order', page: 1 });
  expect(orders.rows).toMatchObject([{ action: 'order.status_changed', actorName: 'Owner' }]);
});
