import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { createTestDb, type TestDb } from '../helpers/db';
import { seeded } from '../helpers/fixtures';
import { customers, discountRedemptions, discounts, orders } from '@/server/db/schema';
import { computeTotals, evaluateDiscount, normalizeCode } from '@/server/discounts';
import { getSettings } from '@/server/settings';

let t: TestDb;
const now = new Date('2026-09-27T10:00:00Z');
const day = 86_400_000;

beforeEach(async () => {
  t = await createTestDb();
  await seeded(t.db);
  const inserted = await t.db
    .insert(discounts)
    .values([
      { code: 'WELCOME10', type: 'percent', value: 10 },
      { code: 'FIVE', type: 'fixed', value: 500 },
      { code: 'BIG', type: 'fixed', value: 5000 },
      { code: 'MIN50', type: 'percent', value: 10, minSubtotalCents: 5000 },
      { code: 'ONCE', type: 'percent', value: 10, usageLimit: 1, usedCount: 1 },
      { code: 'OFF', type: 'percent', value: 10, active: false },
      { code: 'LATER', type: 'percent', value: 10, startsAt: new Date(now.getTime() + day) },
      { code: 'OLD', type: 'percent', value: 10, endsAt: new Date(now.getTime() - day) },
      { code: 'PERPHONE', type: 'percent', value: 10, oncePerPhone: true },
    ])
    .returning({ id: discounts.id, code: discounts.code });
  const perPhone = inserted.find((d) => d.code === 'PERPHONE')!;

  const [c] = await t.db.insert(customers).values({ phone: '+9613123456', name: 'Ali' }).returning();
  const [o] = await t.db
    .insert(orders)
    .values({
      idempotencyKey: crypto.randomUUID(),
      customerId: c!.id,
      locale: 'en',
      name: 'Ali',
      phone: '+9613123456',
      governorate: 'beirut',
      district: 'beirut',
      town: 'Beirut',
      addressLine: 'Street 1',
      subtotalCents: 3600,
      totalCents: 3240,
      ipHash: 'x',
    })
    .returning();
  await t.db
    .insert(discountRedemptions)
    .values({ discountId: perPhone.id, orderId: o!.id, phone: '+9613123456', oncePerPhone: true });
});
afterEach(() => t.close());

const evalCode = (code: string, phone: string | null = null, subtotalCents = 3600) =>
  evaluateDiscount(t.db, { code, subtotalCents, phone, now });

test('codes are trimmed and case-insensitive', async () => {
  expect(normalizeCode('  welcome10 ')).toBe('WELCOME10');
  expect(await evalCode(' welcome10')).toMatchObject({ ok: true, code: 'WELCOME10', amountCents: 360 });
});

test('fixed discounts are capped at the subtotal', async () => {
  expect(await evalCode('FIVE')).toMatchObject({ ok: true, amountCents: 500 });
  expect(await evalCode('BIG')).toMatchObject({ ok: true, amountCents: 3600 });
});

test('percent discounts round to the cent', async () => {
  expect(await evalCode('WELCOME10', null, 5105)).toMatchObject({ ok: true, amountCents: 511 });
});

describe('rejections', () => {
  test.each([
    ['NOPE', 'not_found'],
    ['OFF', 'inactive'],
    ['LATER', 'not_started'],
    ['OLD', 'expired'],
    ['MIN50', 'min_subtotal'],
    ['ONCE', 'usage_limit'],
    ['', 'not_found'],
  ] as const)('%s → %s', async (code, reason) => {
    expect(await evalCode(code)).toEqual({ ok: false, reason });
  });
});

test('once per phone', async () => {
  expect(await evalCode('PERPHONE', '+9613123456')).toEqual({ ok: false, reason: 'already_used' });
  expect((await evalCode('PERPHONE', '+96170123456')).ok).toBe(true);
  expect((await evalCode('PERPHONE', null)).ok).toBe(true);
});

test('totals: discount then delivery threshold on the discounted subtotal', async () => {
  const s = await getSettings(t.db);
  expect(computeTotals({ subtotalCents: 3600, discountCents: 360, settings: s })).toEqual({
    subtotalCents: 3600,
    discountCents: 360,
    deliveryCents: 0,
    totalCents: 3240,
  });
  expect(
    computeTotals({
      subtotalCents: 3600,
      discountCents: 360,
      settings: { ...s, deliveryFeeCents: 300, freeDeliveryThresholdCents: 3500 },
    }),
  ).toEqual({ subtotalCents: 3600, discountCents: 360, deliveryCents: 300, totalCents: 3540 });
});
