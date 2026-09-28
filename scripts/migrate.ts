// Apply SQL migrations in ./drizzle to DATABASE_URL.
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDb } from '../src/server/db/client';
import { databaseUrlFrom } from '../src/env';
import { loadLocalEnv } from './lib/env-file';

export async function runMigrations(url: string): Promise<void> {
  const { db, close } = createDb(url, 1);
  try {
    // Drizzle's migrator accepts any postgres-js drizzle instance.
    await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: 'drizzle' });
  } finally {
    await close();
  }
}

if (require.main === module) {
  loadLocalEnv();
  const url = databaseUrlFrom(process.env);
  if (!url) throw new Error('DATABASE_URL is not set');
  runMigrations(url)
    .then(() => console.log('Migrations applied.'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
