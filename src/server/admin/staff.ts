import { and, asc, count, eq, gt, isNull, ne } from 'drizzle-orm';
import type { StaffRole } from '@/lib/permissions';
import type { Db } from '../db/client';
import { pushSubscriptions, session, staffInvites, user } from '../db/schema';

export async function listStaff(db: Db) {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.createdAt));
}

async function otherActiveOwners(db: Db, excludeId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(user)
    .where(and(eq(user.role, 'owner'), eq(user.active, true), ne(user.id, excludeId)));
  return row?.n ?? 0;
}

export async function setStaffRole(
  db: Db,
  a: { actorId: string; userId: string; role: StaffRole },
): Promise<{ ok: true } | { ok: false; error: 'last_owner' | 'not_found' }> {
  const [target] = await db.select({ role: user.role }).from(user).where(eq(user.id, a.userId));
  if (!target) return { ok: false, error: 'not_found' };
  if (target.role === 'owner' && a.role !== 'owner' && (await otherActiveOwners(db, a.userId)) === 0) {
    return { ok: false, error: 'last_owner' };
  }
  await db.update(user).set({ role: a.role }).where(eq(user.id, a.userId));
  return { ok: true };
}

/** Deactivating signs the person out everywhere and stops their phone notifications. */
export async function setStaffActive(
  db: Db,
  a: { actorId: string; userId: string; active: boolean },
): Promise<{ ok: true } | { ok: false; error: 'self' | 'last_owner' | 'not_found' }> {
  if (!a.active && a.actorId === a.userId) return { ok: false, error: 'self' };
  const [target] = await db.select({ role: user.role }).from(user).where(eq(user.id, a.userId));
  if (!target) return { ok: false, error: 'not_found' };
  if (!a.active && target.role === 'owner' && (await otherActiveOwners(db, a.userId)) === 0) {
    return { ok: false, error: 'last_owner' };
  }
  await db.transaction(async (tx) => {
    await tx.update(user).set({ active: a.active }).where(eq(user.id, a.userId));
    if (!a.active) {
      await tx.delete(session).where(eq(session.userId, a.userId));
      await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, a.userId));
    }
  });
  return { ok: true };
}

export async function revokeSessions(db: Db, userId: string): Promise<void> {
  await db.delete(session).where(eq(session.userId, userId));
}

export async function listPendingInvites(db: Db, now = new Date()) {
  return db
    .select({ id: staffInvites.id, email: staffInvites.email, role: staffInvites.role, expiresAt: staffInvites.expiresAt })
    .from(staffInvites)
    .where(and(isNull(staffInvites.acceptedAt), gt(staffInvites.expiresAt, now)))
    .orderBy(asc(staffInvites.createdAt));
}

export async function revokeInvite(db: Db, id: string): Promise<void> {
  await db.delete(staffInvites).where(and(eq(staffInvites.id, id), isNull(staffInvites.acceptedAt)));
}
