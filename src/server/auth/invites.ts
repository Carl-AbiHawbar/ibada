import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import type { StaffRole } from '@/lib/permissions';
import type { Db } from '../db/client';
import { staffInvites } from '../db/schema';
import type { Auth } from './auth';
import { createStaffUser, isStrongEnough } from './users';

const INVITE_TTL_MS = 72 * 3600_000;
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Single-use invite; only the token's hash is stored. Share the link privately. */
export async function createInvite(
  db: Db,
  a: { email: string; role: StaffRole; invitedBy: string; now?: Date },
): Promise<{ token: string; expiresAt: Date; id: string }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date((a.now ?? new Date()).getTime() + INVITE_TTL_MS);
  const [row] = await db
    .insert(staffInvites)
    .values({ email: a.email.trim().toLowerCase(), role: a.role, tokenHash: hashToken(token), expiresAt, invitedBy: a.invitedBy })
    .returning({ id: staffInvites.id });
  return { token, expiresAt, id: row!.id };
}

export type AcceptInviteResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; error: 'invalid' | 'expired' | 'used' | 'email_taken' | 'weak_password' };

export async function findInvite(db: Db, token: string) {
  const [row] = await db.select().from(staffInvites).where(eq(staffInvites.tokenHash, hashToken(token))).limit(1);
  return row ?? null;
}

export async function acceptInvite(
  db: Db,
  auth: Auth,
  a: { token: string; name: string; password: string; now?: Date },
): Promise<AcceptInviteResult> {
  const now = a.now ?? new Date();
  const invite = await findInvite(db, a.token);
  if (!invite) return { ok: false, error: 'invalid' };
  if (invite.acceptedAt) return { ok: false, error: 'used' };
  if (invite.expiresAt < now) return { ok: false, error: 'expired' };
  if (!isStrongEnough(a.password)) return { ok: false, error: 'weak_password' };
  const name = a.name.trim().slice(0, 60);
  if (!name) return { ok: false, error: 'invalid' };

  // Claim the invite first so two tabs can't both use it.
  const [claimed] = await db
    .update(staffInvites)
    .set({ acceptedAt: now })
    .where(and(eq(staffInvites.id, invite.id), isNull(staffInvites.acceptedAt)))
    .returning({ id: staffInvites.id });
  if (!claimed) return { ok: false, error: 'used' };

  try {
    const { id } = await createStaffUser(auth, { email: invite.email, name, password: a.password, role: invite.role });
    return { ok: true, userId: id, email: invite.email };
  } catch (err) {
    await db.update(staffInvites).set({ acceptedAt: null }).where(eq(staffInvites.id, invite.id));
    if (err instanceof Error && err.message === 'email_taken') return { ok: false, error: 'email_taken' };
    throw err;
  }
}
