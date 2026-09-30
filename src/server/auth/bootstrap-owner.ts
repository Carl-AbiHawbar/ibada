import type { Db } from '../db/client';
import { createAuth } from './auth';
import { createOwnerIfNone } from './users';

type OwnerEnv = Record<string, string | undefined> & { OWNER_EMAIL?: string; OWNER_NAME?: string; OWNER_PASSWORD?: string };

/**
 * Create the first owner from OWNER_EMAIL / OWNER_NAME / OWNER_PASSWORD (set once in the host's
 * settings, then OWNER_PASSWORD removed). Runs during deploys; a no-op once an owner exists.
 */
export async function bootstrapOwner(db: Db, env: OwnerEnv): Promise<'skipped' | 'created' | 'exists'> {
  const email = env.OWNER_EMAIL?.trim();
  const password = env.OWNER_PASSWORD;
  if (!email || !password) return 'skipped';
  try {
    await createOwnerIfNone(createAuth(db), db, { email, name: env.OWNER_NAME?.trim() || 'Owner', password });
    return 'created';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'owner_exists') return 'exists';
    if (msg === 'weak_password') throw new Error('OWNER_PASSWORD must be at least 10 characters');
    throw err;
  }
}
