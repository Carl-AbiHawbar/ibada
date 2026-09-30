import { afterEach, beforeEach, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, type TestDb } from '../helpers/db';
import { bootstrapOwner } from '@/server/auth/bootstrap-owner';
import { user } from '@/server/db/schema';

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.close());

const env = { OWNER_EMAIL: 'Owner@Ibada.test', OWNER_NAME: 'Carl', OWNER_PASSWORD: 'correct-horse-9' };

test('does nothing unless the owner variables are set', async () => {
  expect(await bootstrapOwner(t.db, {})).toBe('skipped');
  expect(await bootstrapOwner(t.db, { OWNER_EMAIL: 'a@b.c' })).toBe('skipped');
  expect(await t.db.select().from(user)).toHaveLength(0);
});

test('creates the owner once, then leaves it alone', async () => {
  expect(await bootstrapOwner(t.db, env)).toBe('created');
  const [owner] = await t.db.select().from(user).where(eq(user.role, 'owner'));
  expect(owner).toMatchObject({ email: 'owner@ibada.test', name: 'Carl', twoFactorEnabled: false });

  expect(await bootstrapOwner(t.db, { ...env, OWNER_EMAIL: 'someone@else.test' })).toBe('exists');
  expect(await t.db.select().from(user)).toHaveLength(1);
});

test('a short password fails loudly so the build log says why', async () => {
  await expect(bootstrapOwner(t.db, { ...env, OWNER_PASSWORD: 'short' })).rejects.toThrow(/at least 10 characters/);
});
