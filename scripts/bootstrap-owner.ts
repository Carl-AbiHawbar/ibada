// Deploy step: create the first owner from OWNER_EMAIL / OWNER_NAME / OWNER_PASSWORD if none exists.
import { databaseUrlFrom } from '../src/env';
import { bootstrapOwner } from '../src/server/auth/bootstrap-owner';
import { createDb } from '../src/server/db/client';
import { loadLocalEnv } from './lib/env-file';

async function main() {
  loadLocalEnv();
  const url = databaseUrlFrom(process.env);
  if (!url) throw new Error('DATABASE_URL is not set');
  const { db, close } = createDb(url, 1);
  try {
    const result = await bootstrapOwner(db, process.env);
    if (result === 'created') console.log('Owner account created. Sign in at /admin, then remove OWNER_PASSWORD from the host settings.');
    if (result === 'exists' && process.env.OWNER_PASSWORD) {
      console.log('An owner already exists; OWNER_PASSWORD is unused. Remove it from the host settings.');
    }
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
