import { z } from 'zod';

// Cloudflare's published always-pass Turnstile keys, used outside production.
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';

const optional = z.string().min(1).optional();

const envSchema = z
  .object({
    APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string({ error: 'DATABASE_URL is required' }).min(1, 'DATABASE_URL is required'),
    SITE_URL: z.url({ error: 'SITE_URL must be a URL' }),
    // Optional here so the storefront renders without it; requireAuthSecret() guards its users.
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters').optional(),
    STORAGE_DRIVER: z.enum(['local', 'supabase']).default('local'),
    SUPABASE_URL: optional,
    SUPABASE_SERVICE_ROLE_KEY: optional,
    SUPABASE_STORAGE_BUCKET: z.string().min(1).default('product-images'),
    VAPID_PUBLIC_KEY: optional,
    VAPID_PRIVATE_KEY: optional,
    VAPID_SUBJECT: z.string().min(1).default('mailto:admin@ibadashop.com'),
    TURNSTILE_SITE_KEY: z.string().min(1).default(TURNSTILE_TEST_SITE_KEY),
    TURNSTILE_SECRET_KEY: z.string().min(1).default(TURNSTILE_TEST_SECRET_KEY),
    RATE_LIMIT_MULTIPLIER: z.coerce.number().int().min(1).max(1000).default(1),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV !== 'production') return;
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });

    for (const key of [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'VAPID_PUBLIC_KEY',
      'VAPID_PRIVATE_KEY',
    ] as const) {
      if (!env[key]) issue(key, `${key} is required in production`);
    }
    if (env.STORAGE_DRIVER !== 'supabase') issue('STORAGE_DRIVER', 'STORAGE_DRIVER must be "supabase" in production');
    if (env.TURNSTILE_SITE_KEY === TURNSTILE_TEST_SITE_KEY || env.TURNSTILE_SECRET_KEY === TURNSTILE_TEST_SECRET_KEY) {
      issue('TURNSTILE_SECRET_KEY', 'TURNSTILE keys must be real keys in production');
    }
    if (env.RATE_LIMIT_MULTIPLIER !== 1) issue('RATE_LIMIT_MULTIPLIER', 'RATE_LIMIT_MULTIPLIER must be 1 in production');
    if (!env.SITE_URL.startsWith('https://')) issue('SITE_URL', 'SITE_URL must use https in production');
  });

export type Env = z.infer<typeof envSchema>;
export type AppEnv = Env['APP_ENV'];

/**
 * The Postgres URL: DATABASE_URL, or POSTGRES_URL as set by Vercel's Supabase integration.
 * The integration's `supa` query marker is dropped: postgres-js would send it to the server as a setting.
 */
export function databaseUrlFrom(raw: Record<string, string | undefined>): string | undefined {
  const value = raw.DATABASE_URL || raw.POSTGRES_URL;
  if (!value?.includes('supa=')) return value || undefined;
  const url = new URL(value);
  url.searchParams.delete('supa');
  return url.toString();
}

/** The auth/signing secret; admin sign-in, checkout rate limits and signed cookies refuse to run without it. */
export function requireAuthSecret(env: Env): string {
  if (!env.BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET is required (admin sign-in and checkout)');
  return env.BETTER_AUTH_SECRET;
}

/** Parse and validate raw environment variables; throws listing every bad key. */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  // Treat empty strings as unset so `KEY=` lines in .env files fall back to defaults.
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined && v !== ''));
  const databaseUrl = databaseUrlFrom(cleaned);
  if (databaseUrl) cleaned.DATABASE_URL = databaseUrl;
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `- ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return result.data;
}

let cached: Env | undefined;

/** Validated environment for the running process (memoized). */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
