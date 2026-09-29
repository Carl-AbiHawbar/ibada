import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware, isAPIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor } from 'better-auth/plugins';
import { getEnv, requireAuthSecret } from '@/env';
import { getClientIp, hashIp } from '../crypto';
import { getDb, type Db } from '../db/client';
import { account, session, twoFactor as twoFactorTable, user, verification } from '../db/schema';
import { hitLimit, peekLimit } from '../rate-limit';

const LOGIN_WINDOW_SECONDS = 15 * 60;
const MAX_FAILS_PER_ACCOUNT = 5;
const MAX_FAILS_PER_IP = 20;
const GUARDED = new Set(['/sign-in/email', '/two-factor/verify-totp', '/two-factor/verify-backup-code']);

type Ctx = { path?: string; headers?: Headers; body?: unknown };

/** Failure counters for a login-type request: per IP always, per account for password sign-in. */
function limitKeys(ctx: Ctx): [key: string, limit: number][] {
  const keys: [string, number][] = [[`login:ip:${hashIp(getClientIp(ctx.headers ?? new Headers()))}`, MAX_FAILS_PER_IP]];
  const email = (ctx.body as { email?: unknown } | undefined)?.email;
  if (ctx.path === '/sign-in/email' && typeof email === 'string') {
    keys.push([`login:acct:${email.trim().toLowerCase()}`, MAX_FAILS_PER_ACCOUNT]);
  }
  return keys;
}

/** Better Auth for the admin: email+password, mandatory TOTP (enforced by authorize()), no sign-up. */
export function createAuth(db: Db) {
  const env = getEnv();
  return betterAuth({
    appName: 'IBADA Admin',
    baseURL: env.SITE_URL,
    basePath: '/api/auth',
    secret: requireAuthSecret(env),
    trustedOrigins: [env.SITE_URL],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification, twoFactor: twoFactorTable },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
    },
    user: {
      additionalFields: {
        role: { type: 'string', input: false, defaultValue: 'staff' },
        active: { type: 'boolean', input: false, defaultValue: true },
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    advanced: { useSecureCookies: env.SITE_URL.startsWith('https://'), cookiePrefix: 'ibada' },
    // Our own Postgres-backed limits below are authoritative; the built-in (in-memory) one is extra in production.
    rateLimit: { enabled: env.APP_ENV === 'production' },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!GUARDED.has(ctx.path)) return;
        for (const [key, limit] of limitKeys(ctx)) {
          if (!(await peekLimit(db, key, limit, LOGIN_WINDOW_SECONDS))) {
            throw new APIError('TOO_MANY_REQUESTS', { message: 'Too many attempts. Try again in 15 minutes.' });
          }
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (!GUARDED.has(ctx.path) || !isAPIError(ctx.context.returned)) return;
        for (const [key] of limitKeys(ctx)) await hitLimit(db, key, 1, LOGIN_WINDOW_SECONDS);
      }),
    },
    plugins: [
      twoFactor({
        issuer: 'IBADA Admin',
        backupCodeOptions: { amount: 10 },
        accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: LOGIN_WINDOW_SECONDS },
      }),
      nextCookies(), // must stay last
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const holder = globalThis as unknown as { __ibadaAuth?: Auth };

/** Shared app auth instance (created on first use). */
export function getAuth(): Auth {
  holder.__ibadaAuth ??= createAuth(getDb());
  return holder.__ibadaAuth;
}
