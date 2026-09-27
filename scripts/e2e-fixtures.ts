// Extra rows the browser tests rely on, on top of the normal seed.
import { createAuth } from '../src/server/auth/auth';
import { createOwnerIfNone } from '../src/server/auth/users';
import { createDb } from '../src/server/db/client';
import { discounts } from '../src/server/db/schema';

export const E2E = {
  ownerEmail: 'owner@ibada.test',
  ownerPassword: 'e2e-owner-password-123',
  ownerName: 'E2E Owner',
};

export async function e2eFixtures(url: string): Promise<void> {
  const { db, close } = createDb(url, 1);
  try {
    await db.insert(discounts).values({ code: 'WELCOME10', type: 'percent', value: 10 }).onConflictDoNothing();
    // Owner without 2FA yet: the admin.setup E2E test enrolls the authenticator.
    await createOwnerIfNone(createAuth(db), db, { email: E2E.ownerEmail, name: E2E.ownerName, password: E2E.ownerPassword });
  } finally {
    await close();
  }
}
