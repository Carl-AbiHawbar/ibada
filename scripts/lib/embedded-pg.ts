import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

/** Stop a cluster left running by a killed process (safe to call when nothing runs). */
export function stopStaleCluster(dataDir: string): void {
  const databaseDir = path.resolve(process.cwd(), dataDir);
  if (!existsSync(path.join(databaseDir, 'postmaster.pid'))) return;
  const platform = process.platform === 'win32' ? 'windows' : process.platform;
  const pkg = path.dirname(require.resolve(`@embedded-postgres/${platform}-${process.arch}/package.json`));
  const pgCtl = path.join(pkg, 'native', 'bin', process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl');
  try {
    execFileSync(pgCtl, ['stop', '-D', databaseDir, '-m', 'immediate', '-w'], { stdio: 'ignore' });
  } catch {
    // Not running (stale pid file) — nothing to stop.
  }
}

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
