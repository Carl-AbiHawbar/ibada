// Local development database: `npm run db:start` keeps Postgres running until Ctrl+C.
import { startLocalPg } from './lib/embedded-pg';

async function main() {
  const pg = await startLocalPg({ dataDir: '.data/pg', port: 54329, database: 'ibada' });
  console.log(`Postgres ready at ${pg.url}\nPress Ctrl+C to stop.`);
  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  // Keep the process alive.
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
