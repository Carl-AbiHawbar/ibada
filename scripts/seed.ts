// Insert the settings row and the IBADA ONE catalogue if missing (safe to re-run).
import { createDb } from '../src/server/db/client';
import { seedCatalog, seedSettings } from '../src/server/db/seed';
import { loadLocalEnv } from './lib/env-file';

export async function runSeed(url: string): Promise<void> {
  const { db, close } = createDb(url, 1);
  try {
    await seedSettings(db);
    const { productId } = await seedCatalog(db);
    console.log(`Seeded settings and product ${productId}.`);
  } finally {
    await close();
  }
}

if (require.main === module) {
  loadLocalEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  runSeed(url).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
