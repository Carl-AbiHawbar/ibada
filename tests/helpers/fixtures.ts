import type { Db } from '@/server/db/client';
import { settings } from '@/server/db/schema';
import { seedCatalog, seedSettings, type SeededCatalog } from '@/server/db/seed';

/**
 * Settings row + IBADA ONE catalogue (stock 100), with delivery free so order totals equal the goods.
 * Tests about the delivery fee set it themselves; the shipped default ($4) is checked in db.test.ts.
 */
export async function seeded(db: Db): Promise<SeededCatalog> {
  await seedSettings(db);
  await db.update(settings).set({ deliveryFeeCents: 0 });
  return seedCatalog(db);
}
