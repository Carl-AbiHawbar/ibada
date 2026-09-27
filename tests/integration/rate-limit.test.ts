import { afterEach, beforeEach, expect, test } from 'vitest';
import { createTestDb, type TestDb } from '../helpers/db';
import { hitLimit, peekLimit } from '@/server/rate-limit';

let t: TestDb;
const now = new Date('2026-09-27T10:15:00Z');
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.close());

test('allows up to the limit, then refuses', async () => {
  for (let i = 1; i <= 5; i++) {
    expect(await hitLimit(t.db, 'k', 5, 3600, now)).toEqual({ allowed: true, count: i });
  }
  expect(await hitLimit(t.db, 'k', 5, 3600, now)).toEqual({ allowed: false, count: 6 });
});

test('keys are independent', async () => {
  for (let i = 0; i < 6; i++) await hitLimit(t.db, 'k', 5, 3600, now);
  expect((await hitLimit(t.db, 'other', 5, 3600, now)).allowed).toBe(true);
});

test('a new window starts fresh', async () => {
  for (let i = 0; i < 6; i++) await hitLimit(t.db, 'k', 5, 3600, now);
  expect(await hitLimit(t.db, 'k', 5, 3600, new Date(now.getTime() + 3600_000))).toEqual({ allowed: true, count: 1 });
});

test('peek does not consume', async () => {
  expect(await peekLimit(t.db, 'p', 1, 60, now)).toBe(true);
  expect(await peekLimit(t.db, 'p', 1, 60, now)).toBe(true);
  await hitLimit(t.db, 'p', 1, 60, now);
  expect(await peekLimit(t.db, 'p', 1, 60, now)).toBe(false);
});

test('concurrent hits are all counted', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, () => hitLimit(t.db, 'c', 5, 60, now)));
  expect(results.map((r) => r.count).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(results.filter((r) => r.allowed)).toHaveLength(5);
});
