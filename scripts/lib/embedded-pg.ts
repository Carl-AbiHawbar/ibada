import { existsSync } from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

export type LocalPg = { url: string; stop: () => Promise<void> };

/**
 * Start a real Postgres server from npm binaries (no Docker needed).
 * Initialises the data directory and creates `database` on first run.
 */
export async function startLocalPg(opts: { dataDir: string; port: number; database: string }): Promise<LocalPg> {
  const databaseDir = path.resolve(process.cwd(), opts.dataDir);
  const firstRun = !existsSync(path.join(databaseDir, 'PG_VERSION'));
  const pg = new EmbeddedPostgres({
    databaseDir,
    port: opts.port,
    user: 'postgres',
    password: 'postgres',
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
  });
  if (firstRun) await pg.initialise();
  await pg.start();
  if (firstRun) await pg.createDatabase(opts.database);
  return {
    url: `postgres://postgres:postgres@localhost:${opts.port}/${opts.database}`,
    stop: () => pg.stop(),
  };
}
