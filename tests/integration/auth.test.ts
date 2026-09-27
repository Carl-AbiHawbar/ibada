import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../helpers/db';
import { auditLog, staffInvites, user } from '@/server/db/schema';
import { audit } from '@/server/audit';
import { createAuth, type Auth } from '@/server/auth/auth';
import { createOwnerIfNone, createStaffUser } from '@/server/auth/users';
import { acceptInvite, createInvite } from '@/server/auth/invites';

let t: TestDb;
let auth: Auth;
beforeEach(async () => {
  t = await createTestDb();
  auth = createAuth(t.db);
});
afterEach(() => t.close());

const signIn = (email: string, password: string, ip = '9.9.9.9') =>
  auth.api.signInEmail({ body: { email, password }, headers: new Headers({ 'x-forwarded-for': ip }) });

describe('accounts', () => {
  it('signs in created staff and blocks public sign-up', async () => {
    const { id } = await createStaffUser(auth, { email: 'Owner@X.test', name: 'Owner', password: 'right-password-123', role: 'owner' });
    const [row] = await t.db.select().from(user).where(eq(user.id, id));
    expect(row).toMatchObject({ email: 'owner@x.test', role: 'owner', active: true, twoFactorEnabled: false });

    const res = await signIn('owner@x.test', 'right-password-123');
    expect(res.user.id).toBe(id);
    await expect(signIn('owner@x.test', 'wrong-password!!')).rejects.toThrow();
    await expect(
      auth.api.signUpEmail({ body: { email: 'intruder@x.test', password: 'intruder-pass-123', name: 'X' } }),
    ).rejects.toThrow();
  });

  it('rejects short passwords and duplicate emails', async () => {
    await expect(createStaffUser(auth, { email: 'a@x.test', name: 'A', password: 'short', role: 'staff' })).rejects.toThrow(
      'weak_password',
    );
    await createStaffUser(auth, { email: 'a@x.test', name: 'A', password: 'long-enough-1', role: 'staff' });
    await expect(createStaffUser(auth, { email: 'A@x.test', name: 'A', password: 'long-enough-1', role: 'staff' })).rejects.toThrow(
      'email_taken',
    );
  });

  it('owner bootstrap runs once', async () => {
    await createOwnerIfNone(auth, t.db, { email: 'o@x.test', name: 'O', password: 'owner-password-1' });
    await expect(createOwnerIfNone(auth, t.db, { email: 'o2@x.test', name: 'O2', password: 'owner-password-1' })).rejects.toThrow(
      'owner_exists',
    );
  });
});

describe('login limits', () => {
  beforeEach(async () => {
    await createStaffUser(auth, { email: 'owner@x.test', name: 'Owner', password: 'right-password-123', role: 'owner' });
    await createStaffUser(auth, { email: 'other@x.test', name: 'Other', password: 'right-password-123', role: 'staff' });
  });

  it('locks an account after 5 failed attempts, even with the right password', async () => {
    for (let i = 0; i < 5; i++) await expect(signIn('owner@x.test', 'wrong-password!!')).rejects.toThrow();
    await expect(signIn('owner@x.test', 'right-password-123')).rejects.toMatchObject({ statusCode: 429 });
    // Same IP, different account: still allowed (5 < 20 per IP).
    await expect(signIn('other@x.test', 'right-password-123')).resolves.toBeTruthy();
  });

  it('successful logins do not count as failures', async () => {
    for (let i = 0; i < 8; i++) await signIn('owner@x.test', 'right-password-123');
    await expect(signIn('owner@x.test', 'right-password-123')).resolves.toBeTruthy();
  });

  it('limits one IP to 20 failures across accounts', async () => {
    for (let i = 0; i < 20; i++) {
      await expect(signIn(`nobody${i}@x.test`, 'wrong-password!!', '7.7.7.7')).rejects.toThrow();
    }
    await expect(signIn('other@x.test', 'right-password-123', '7.7.7.7')).rejects.toMatchObject({ statusCode: 429 });
    await expect(signIn('other@x.test', 'right-password-123', '8.8.8.8')).resolves.toBeTruthy();
  });
});

describe('invites', () => {
  const now = new Date('2026-09-27T10:00:00Z');
  let ownerId: string;
  beforeEach(async () => {
    ({ id: ownerId } = await createStaffUser(auth, { email: 'owner@x.test', name: 'Owner', password: 'owner-password-1', role: 'owner' }));
  });

  it('creates a staff account from a single-use hashed token', async () => {
    const { token, expiresAt } = await createInvite(t.db, { email: 'Staff@X.test', role: 'staff', invitedBy: ownerId, now });
    expect(expiresAt).toEqual(new Date('2026-09-30T10:00:00Z'));
    const [row] = await t.db.select().from(staffInvites);
    expect(row!.tokenHash).not.toBe(token);
    expect(row!.email).toBe('staff@x.test');

    const r = await acceptInvite(t.db, auth, { token, name: 'Sara', password: 'staff-password-1', now });
    expect(r).toMatchObject({ ok: true });
    const [created] = await t.db.select().from(user).where(eq(user.email, 'staff@x.test'));
    expect(created).toMatchObject({ role: 'staff', name: 'Sara', active: true });
    expect(await acceptInvite(t.db, auth, { token, name: 'Sara', password: 'staff-password-1', now })).toEqual({
      ok: false,
      error: 'used',
    });
  });

  it('expires after 72 hours and rejects unknown tokens', async () => {
    const { token } = await createInvite(t.db, { email: 'late@x.test', role: 'staff', invitedBy: ownerId, now });
    const later = new Date(now.getTime() + 73 * 3600_000);
    expect(await acceptInvite(t.db, auth, { token, name: 'L', password: 'staff-password-1', now: later })).toEqual({
      ok: false,
      error: 'expired',
    });
    expect(await acceptInvite(t.db, auth, { token: 'nope', name: 'L', password: 'staff-password-1', now })).toEqual({
      ok: false,
      error: 'invalid',
    });
  });

  it('refuses an invite for an existing account and weak passwords', async () => {
    const { token } = await createInvite(t.db, { email: 'owner@x.test', role: 'staff', invitedBy: ownerId, now });
    expect(await acceptInvite(t.db, auth, { token, name: 'X', password: 'staff-password-1', now })).toEqual({
      ok: false,
      error: 'email_taken',
    });
    const other = await createInvite(t.db, { email: 'new@x.test', role: 'staff', invitedBy: ownerId, now });
    expect(await acceptInvite(t.db, auth, { token: other.token, name: 'X', password: 'short', now })).toEqual({
      ok: false,
      error: 'weak_password',
    });
  });
});

it('audit writes a row', async () => {
  await audit(t.db, { userId: null, action: 'order.status_changed', entity: 'order', entityId: 'o1', summary: '#1001 New → Confirmed', ip: '1.2.3.4' });
  const [row] = await t.db.select().from(auditLog);
  expect(row).toMatchObject({ action: 'order.status_changed', entity: 'order', entityId: 'o1', summary: '#1001 New → Confirmed' });
  expect(row!.ipHash).toMatch(/^[0-9a-f]{64}$/);
});
