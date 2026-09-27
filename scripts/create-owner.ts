// First owner account: npm run admin:create-owner -- --email you@example.com --name "Your Name"
// Asks for the password (hidden). OWNER_PASSWORD may be set instead for automation.
import { parseArgs } from 'node:util';
import { createAuth } from '../src/server/auth/auth';
import { createOwnerIfNone } from '../src/server/auth/users';
import { createDb } from '../src/server/db/client';
import { loadLocalEnv } from './lib/env-file';

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (ch: string) => {
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off('data', onData);
        process.stdout.write('\n');
        resolve(value);
      } else if (ch === '\u0003') {
        process.exit(1);
      } else if (ch === '\u007f' || ch === '\b') {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  loadLocalEnv();
  const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' } } });
  if (!values.email || !values.name) {
    console.error('Usage: npm run admin:create-owner -- --email you@example.com --name "Your Name"');
    process.exit(1);
  }
  let password = process.env.OWNER_PASSWORD ?? '';
  if (!password) {
    password = await askHidden('Password (min 10 characters): ');
    const again = await askHidden('Repeat password: ');
    if (password !== again) throw new Error('Passwords do not match');
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { db, close } = createDb(url, 1);
  try {
    await createOwnerIfNone(createAuth(db), db, { email: values.email, name: values.name, password });
    const site = process.env.SITE_URL ?? 'your site';
    console.log(`Owner created. Sign in at ${site}/admin and set up your authenticator app.`);
  } finally {
    await close();
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(
    msg === 'owner_exists'
      ? 'An owner already exists. Invite more people from Admin → Staff.'
      : msg === 'weak_password'
        ? 'Password must be 10–128 characters.'
        : msg,
  );
  process.exit(1);
});
