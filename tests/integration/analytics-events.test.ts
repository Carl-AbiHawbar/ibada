import { afterEach, beforeEach, expect, test } from 'vitest';
import { createTestDb, type TestDb } from '../helpers/db';
import { events } from '@/server/db/schema';
import { recordEvent } from '@/server/analytics';

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.close());

test('records an anonymous funnel step', async () => {
  const now = new Date('2026-09-27T10:00:00Z');
  await recordEvent(t.db, { type: 'add_to_cart', sessionId: 's', locale: 'ar', now });
  expect(await t.db.select().from(events)).toMatchObject([{ type: 'add_to_cart', sessionId: 's', locale: 'ar', createdAt: now }]);
});
