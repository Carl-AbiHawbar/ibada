import type { Db } from '@/server/db/client';
import { seedCatalog, seedSettings, type SeededCatalog } from '@/server/db/seed';

/** Settings row + IBADA ONE catalogue (stock 100). */
export async function seeded(db: Db): Promise<SeededCatalog> {
  await seedSettings(db);
  return seedCatalog(db);
}
