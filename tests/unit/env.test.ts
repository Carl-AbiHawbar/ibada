import { describe, expect, test } from 'vitest';
import { databaseUrlFrom, parseEnv } from '@/env';

const base = {
  DATABASE_URL: 'postgres://x',
  SITE_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
};

const prod = {
  ...base,
  APP_ENV: 'production',
  SITE_URL: 'https://ibadashop.com',
  STORAGE_DRIVER: 'supabase',
  SUPABASE_URL: 'https://p.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'k',
  VAPID_PUBLIC_KEY: 'p',
  VAPID_PRIVATE_KEY: 'q',
  TURNSTILE_SITE_KEY: 's',
  TURNSTILE_SECRET_KEY: 't',
};

describe('parseEnv', () => {
  test('development defaults', () => {
    const e = parseEnv(base);
    expect(e.APP_ENV).toBe('development');
    expect(e.STORAGE_DRIVER).toBe('local');
    expect(e.TURNSTILE_SITE_KEY).toBe('1x00000000000000000000AA');
    expect(e.TURNSTILE_SECRET_KEY).toBe('1x0000000000000000000000000000000AA');
    expect(e.SUPABASE_STORAGE_BUCKET).toBe('product-images');
    expect(e.VAPID_SUBJECT).toBe('mailto:admin@ibadashop.com');
    expect(e.RATE_LIMIT_MULTIPLIER).toBe(1);
  });

  test('production requires every service key', () => {
    expect(() => parseEnv({ ...base, APP_ENV: 'production' })).toThrow(/SUPABASE_URL/);
    expect(parseEnv(prod).STORAGE_DRIVER).toBe('supabase');
  });

  test('production rejects local storage, test turnstile keys and a multiplier', () => {
    expect(() => parseEnv({ ...prod, STORAGE_DRIVER: 'local' })).toThrow(/STORAGE_DRIVER/);
    expect(() =>
      parseEnv({ ...prod, TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' }),
    ).toThrow(/TURNSTILE/);
    expect(() => parseEnv({ ...prod, RATE_LIMIT_MULTIPLIER: '100' })).toThrow(/RATE_LIMIT_MULTIPLIER/);
  });

  test('secret must be at least 32 chars', () => {
    expect(() => parseEnv({ ...base, BETTER_AUTH_SECRET: 'short' })).toThrow(/BETTER_AUTH_SECRET/);
  });

  test('falls back to POSTGRES_URL from the Vercel Supabase integration', () => {
    const { DATABASE_URL: _, ...rest } = base;
    expect(parseEnv({ ...rest, POSTGRES_URL: 'postgres://u:p@pooler:6543/postgres' }).DATABASE_URL).toBe(
      'postgres://u:p@pooler:6543/postgres',
    );
  });

  test('DATABASE_URL wins over POSTGRES_URL', () => {
    expect(parseEnv({ ...base, POSTGRES_URL: 'postgres://other' }).DATABASE_URL).toBe('postgres://x');
  });

  test('drops the integration-only supa parameter but keeps sslmode', () => {
    expect(databaseUrlFrom({ POSTGRES_URL: 'postgres://u:p@h:6543/postgres?sslmode=require&supa=base-pooler.x' })).toBe(
      'postgres://u:p@h:6543/postgres?sslmode=require',
    );
    expect(databaseUrlFrom({})).toBeUndefined();
  });

  test('missing DATABASE_URL is reported', () => {
    expect(() => parseEnv({ SITE_URL: base.SITE_URL, BETTER_AUTH_SECRET: base.BETTER_AUTH_SECRET })).toThrow(
      /DATABASE_URL/,
    );
  });
});
