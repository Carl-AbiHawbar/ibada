import { eq } from 'drizzle-orm';
import type { StaffRole } from '@/lib/permissions';
import type { Db } from '../db/client';
import { user } from '../db/schema';
import type { Auth } from './auth';

export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 128;

export const isStrongEnough = (password: string) => password.length >= MIN_PASSWORD && password.length <= MAX_PASSWORD;

/** Create an admin user with a password (the only way accounts are made: owner CLI or invite). */
export async function createStaffUser(
  auth: Auth,
  a: { email: string; name: string; password: string; role: StaffRole },
): Promise<{ id: string }> {
  const ctx = await auth.$context;
  const email = a.email.trim().toLowerCase();
  if (!isStrongEnough(a.password)) throw new Error('weak_password');
  if (await ctx.internalAdapter.findUserByEmail(email)) throw new Error('email_taken');
  const hash = await ctx.password.hash(a.password);
  const created = await ctx.internalAdapter.createUser(
    { email, name: a.name.trim(), emailVerified: true, role: a.role, active: true },
    { method: 'admin' },
  );
  await ctx.internalAdapter.linkAccount({ userId: created.id, providerId: 'credential', accountId: created.id, password: hash });
  return { id: created.id };
}

/** First-run owner account; refuses once any owner exists. */
export async function createOwnerIfNone(
  auth: Auth,
  db: Db,
  a: { email: string; name: string; password: string },
): Promise<{ id: string }> {
  const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.role, 'owner')).limit(1);
  if (owner) throw new Error('owner_exists');
  return createStaffUser(auth, { ...a, role: 'owner' });
}
