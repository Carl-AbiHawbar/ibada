import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from '../helpers/db';
import { seeded } from '../helpers/fixtures';
import { insertStaff, placeTestOrder, checkoutInput, orderContext } from '../helpers/orders';
import { reviews } from '@/server/db/schema';
import { getCustomer, listCustomers, setCustomerBlocked, setCustomerNotes } from '@/server/admin/customers';
import { discountInputSchema, listDiscounts, saveDiscount, setDiscountActive } from '@/server/discounts';
import { placeOrder } from '@/server/orders/place-order';
import { changeOrderStatus } from '@/server/orders/manage';
import {
  deleteReview,
  getReviewSummary,
  listReviewsAdmin,
  reviewInputSchema,
  saveReview,
  setReviewVisible,
} from '@/server/reviews';
import type { SeededCatalog } from '@/server/db/seed';

let t: TestDb;
let s: SeededCatalog;
beforeEach(async () => {
  t = await createTestDb();
  s = await seeded(t.db);
});
afterEach(() => t.close());

describe('customers', () => {
  it('searches by phone digits or name and sorts by spend', async () => {
    const userId = await insertStaff(t.db);
    const a = await placeTestOrder(t.db, s.bundleIds.full, { name: 'Ali Haddad', phone: '03 123 456' });
    await placeTestOrder(t.db, s.bundleIds.single, { name: 'Maya Khoury', phone: '70 999 888' });
    for (const to of ['confirmed', 'out_for_delivery', 'delivered'] as const) {
      await changeOrderStatus(t.db, { orderId: a.orderId, to, userId, now: new Date() });
    }
    expect((await listCustomers(t.db, { q: '3123456', sort: 'recent', page: 1 })).rows.map((r) => r.name)).toEqual(['Ali Haddad']);
    expect((await listCustomers(t.db, { q: 'khou', sort: 'recent', page: 1 })).rows.map((r) => r.name)).toEqual(['Maya Khoury']);
    const bySpend = await listCustomers(t.db, { sort: 'spent', page: 1 });
    expect(bySpend.rows.map((r) => [r.name, r.totalSpentCents])).toEqual([
      ['Ali Haddad', 5999],
      ['Maya Khoury', 0],
    ]);
    expect(bySpend.total).toBe(2);
  });

  it('customer detail lists their orders; notes are saved', async () => {
    await placeTestOrder(t.db, s.bundleIds.double);
    await placeTestOrder(t.db, s.bundleIds.single);
    const [row] = (await listCustomers(t.db, { sort: 'recent', page: 1 })).rows;
    await setCustomerNotes(t.db, { id: row!.id, notes: 'Prefers evening delivery' });
    const c = (await getCustomer(t.db, row!.id))!;
    expect(c.customer).toMatchObject({ orderCount: 2, notes: 'Prefers evening delivery' });
    expect(c.orders).toHaveLength(2);
    expect(await getCustomer(t.db, crypto.randomUUID())).toBeNull();
  });

  it('blocking stops checkout', async () => {
    await placeTestOrder(t.db, s.bundleIds.double);
    const [row] = (await listCustomers(t.db, { sort: 'recent', page: 1 })).rows;
    await setCustomerBlocked(t.db, { id: row!.id, blocked: true, reason: 'fake orders' });
    expect(await placeOrder(t.db, checkoutInput(s.bundleIds.double), orderContext({ ip: '4.4.4.4' }))).toMatchObject({
      ok: false,
      error: 'blocked',
    });
    await setCustomerBlocked(t.db, { id: row!.id, blocked: false });
    expect((await placeOrder(t.db, checkoutInput(s.bundleIds.double), orderContext({ ip: '4.4.4.5' }))).ok).toBe(true);
  });
});

describe('discounts', () => {
  const base = {
    code: 'welcome10',
    type: 'percent',
    value: 10,
    minSubtotalCents: null,
    usageLimit: null,
    oncePerPhone: false,
    startsAt: null,
    endsAt: null,
    active: true,
  };

  it('validates codes and values', () => {
    expect(discountInputSchema.safeParse({ ...base, code: 'welcome 10' }).success).toBe(false);
    expect(discountInputSchema.safeParse({ ...base, value: 0 }).success).toBe(false);
    expect(discountInputSchema.safeParse({ ...base, value: 101 }).success).toBe(false);
    expect(discountInputSchema.safeParse({ ...base, type: 'fixed', value: 500 }).success).toBe(true);
    expect(
      discountInputSchema.safeParse({ ...base, startsAt: new Date('2026-10-02'), endsAt: new Date('2026-10-01') }).success,
    ).toBe(false);
  });

  it('saves codes uppercase and refuses duplicates in any case', async () => {
    const r = await saveDiscount(t.db, { input: base });
    expect(r).toMatchObject({ ok: true });
    expect((await listDiscounts(t.db))[0]).toMatchObject({ code: 'WELCOME10', usedCount: 0, active: true });
    expect(await saveDiscount(t.db, { input: { ...base, code: 'Welcome10' } })).toMatchObject({ ok: false, error: 'code_taken' });
    if (!r.ok) throw new Error('setup');
    await setDiscountActive(t.db, r.id, false);
    expect((await listDiscounts(t.db))[0]!.active).toBe(false);
    expect(await saveDiscount(t.db, { id: r.id, input: { ...base, value: 15 } })).toEqual({ ok: true, id: r.id });
    expect((await listDiscounts(t.db))[0]!.value).toBe(15);
  });
});

describe('reviews', () => {
  const review = (over: Record<string, unknown> = {}) => ({
    productId: s.productId,
    authorName: 'Rana',
    rating: 5,
    body: 'No more ants in the kitchen.',
    locale: 'en',
    reviewDate: new Date('2026-09-20'),
    photoUrl: null,
    visible: true,
    ...over,
  });

  it('hidden reviews leave the summary', async () => {
    const ids: string[] = [];
    for (const rating of [5, 4, 4]) {
      const r = await saveReview(t.db, { input: review({ rating }) });
      if (!r.ok) throw new Error('setup');
      ids.push(r.id);
    }
    expect((await getReviewSummary(t.db, s.productId)).count).toBe(3);
    await setReviewVisible(t.db, ids[0]!, false);
    expect(await getReviewSummary(t.db, s.productId)).toMatchObject({ count: 2, average: 4 });
    expect((await listReviewsAdmin(t.db, { visible: false, page: 1 })).rows).toHaveLength(1);
    await deleteReview(t.db, ids[1]!);
    expect(await t.db.select().from(reviews)).toHaveLength(2);
  });

  it('validates rating, text and date', () => {
    expect(reviewInputSchema.safeParse(review({ rating: 6 })).success).toBe(false);
    expect(reviewInputSchema.safeParse(review({ body: '' })).success).toBe(false);
    expect(reviewInputSchema.safeParse(review({ reviewDate: new Date(Date.now() + 3 * 86_400_000) })).success).toBe(false);
    expect(reviewInputSchema.safeParse(review()).success).toBe(true);
  });
});
