import { expect, test } from 'vitest';
import { isConcurrentMigrationError, withMigrationRetry } from '@/server/db/migration-retry';

const pgError = (code: string) => Object.assign(new Error('boom'), { code });

test('duplicate-object errors from a parallel migration are retryable', () => {
  expect(isConcurrentMigrationError(pgError('23505'))).toBe(true); // pg_type row for a CREATE TYPE
  expect(isConcurrentMigrationError(pgError('42P07'))).toBe(true); // duplicate table
  expect(isConcurrentMigrationError(pgError('42710'))).toBe(true); // duplicate object
  expect(isConcurrentMigrationError(pgError('42601'))).toBe(false); // syntax error
  expect(isConcurrentMigrationError(new Error('connection refused'))).toBe(false);
});

test('retries after a concurrent migration, then succeeds', async () => {
  let calls = 0;
  const result = await withMigrationRetry(
    async () => {
      calls += 1;
      if (calls === 1) throw pgError('23505');
      return 'migrated';
    },
    { attempts: 3, delayMs: 0 },
  );
  expect(result).toBe('migrated');
  expect(calls).toBe(2);
});

test('other errors fail immediately', async () => {
  let calls = 0;
  await expect(
    withMigrationRetry(
      async () => {
        calls += 1;
        throw pgError('42601');
      },
      { attempts: 3, delayMs: 0 },
    ),
  ).rejects.toThrow('boom');
  expect(calls).toBe(1);
});

test('gives up after the last attempt', async () => {
  let calls = 0;
  await expect(
    withMigrationRetry(
      async () => {
        calls += 1;
        throw pgError('42P07');
      },
      { attempts: 3, delayMs: 0 },
    ),
  ).rejects.toThrow('boom');
  expect(calls).toBe(3);
});
