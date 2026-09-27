import { afterEach, beforeEach, expect, test } from 'vitest';
import { createTestDb, type TestDb } from '../helpers/db';
import { seeded } from '../helpers/fixtures';
import { reviews } from '@/server/db/schema';
import { deliveryFeeFor, getSettings } from '@/server/settings';
import { getReviewSummary, listVisibleReviews } from '@/server/reviews';
import type { SeededCatalog } from '@/server/db/seed';

let t: TestDb;
let s: SeededCatalog;
beforeEach(async () => {
  t = await createTestDb();
  s = await seeded(t.db);
});
afterEach(() => t.close());

test('settings view', async () => {
  const st = await getSettings(t.db);
  expect(st).toMatchObject({
    storeName: 'IBADA',
    deliveryFeeCents: 0,
    freeDeliveryThresholdCents: null,
    announcementEnabled: true,
    trustpilotUrl: null,
    contactPhone: null,
    social: {},
  });
  expect(st.announcement.en).toContain('Cash on delivery');
  expect(st.deliveryTime.ar).toContain('أيام عمل');
});

test('delivery fee honours the free threshold after discount', async () => {
  const st = await getSettings(t.db);
  expect(deliveryFeeFor(st, 3600)).toBe(0);
  expect(deliveryFeeFor({ ...st, deliveryFeeCents: 300 }, 3600)).toBe(300);
  expect(deliveryFeeFor({ ...st, deliveryFeeCents: 300, freeDeliveryThresholdCents: 5000 }, 5000)).toBe(0);
  expect(deliveryFeeFor({ ...st, deliveryFeeCents: 300, freeDeliveryThresholdCents: 5000 }, 4999)).toBe(300);
});

test('no reviews yet', async () => {
  expect(await getReviewSummary(t.db, s.productId)).toEqual({
    count: 0,
    average: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
});

test('summary counts only visible reviews', async () => {
  const base = { productId: s.productId, body: 'ok', locale: 'en' as const };
  await t.db.insert(reviews).values([
    { ...base, authorName: 'A', rating: 5, reviewDate: new Date('2026-09-01') },
    { ...base, authorName: 'B', rating: 4, reviewDate: new Date('2026-09-03') },
    { ...base, authorName: 'C', rating: 4, reviewDate: new Date('2026-09-02') },
    { ...base, authorName: 'Hidden', rating: 1, visible: false, reviewDate: new Date('2026-09-04') },
  ]);
  expect(await getReviewSummary(t.db, s.productId)).toEqual({
    count: 3,
    average: 4.3,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 },
  });
  const page1 = await listVisibleReviews(t.db, s.productId, { limit: 2, offset: 0 });
  expect(page1.map((r) => r.authorName)).toEqual(['B', 'C']);
  expect(page1[0]!.reviewDate).toBe('2026-09-03T00:00:00.000Z');
  expect((await listVisibleReviews(t.db, s.productId, { limit: 2, offset: 2 })).map((r) => r.authorName)).toEqual(['A']);
});
