// Fresh database + production build + `next start` on :3100 for Playwright.
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import webpush from 'web-push';
import { e2eFixtures } from './e2e-fixtures';
import { startLocalPg, stopStaleCluster } from './lib/embedded-pg';
import { runMigrations } from './migrate';
import { runSeed } from './seed';

const PORT = 3100;

function run(cmd: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, { shell: true, stdio: 'inherit', env });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
  });
}

async function main() {
  stopStaleCluster('.data/pg-e2e');
  rmSync('.data/pg-e2e', { recursive: true, force: true });
  const pg = await startLocalPg({ dataDir: '.data/pg-e2e', port: 54330, database: 'ibada_e2e' });
  const vapid = webpush.generateVAPIDKeys();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    APP_ENV: 'test',
    NEXT_DIST_DIR: '.next-e2e',
    DATABASE_URL: pg.url,
    SITE_URL: `http://localhost:${PORT}`,
    BETTER_AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-1234567890',
    STORAGE_DRIVER: 'local',
    RATE_LIMIT_MULTIPLIER: '100',
    TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
    TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
    VAPID_PUBLIC_KEY: vapid.publicKey,
    VAPID_PRIVATE_KEY: vapid.privateKey,
  };
  Object.assign(process.env, env);

  await runMigrations(pg.url);
  await runSeed(pg.url);
  await e2eFixtures(pg.url);

  const shutdown = async () => {
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await run('npx next build', env);
  await run(`npx next start -p ${PORT}`, env);
  await shutdown();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
