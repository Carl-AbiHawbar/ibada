// Extra rows the browser tests rely on, on top of the normal seed.
import { createDb } from '../src/server/db/client';

export const E2E = {
  ownerEmail: 'owner@ibada.test',
  ownerPassword: 'e2e-owner-password-123',
  ownerName: 'E2E Owner',
};

export async function e2eFixtures(url: string): Promise<void> {
  const { db, close } = createDb(url, 1);
  try {
    void db; // Later tasks add discount codes and the owner account here.
  } finally {
    await close();
  }
}
