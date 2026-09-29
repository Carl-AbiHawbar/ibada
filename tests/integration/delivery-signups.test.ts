import { afterEach, beforeEach, expect, test } from 'vitest';
import { createTestDb, type TestDb } from '../helpers/db';
import { deliverySignups } from '@/server/db/schema';
import { deliverySignupsToCsv, listDeliverySignups, saveDeliverySignup } from '@/server/delivery-signups';

let t: TestDb;
beforeEach(async () => {
  t = await createTestDb();
});
afterEach(() => t.close());

const ctx = (now = new Date('2026-10-01T10:00:00Z')) => ({ ipHash: 'h', now });
const input = (over: Record<string, unknown> = {}) => ({
  name: 'Maya Khoury',
  email: '  Maya@Example.com ',
  phone: '03 123 456',
  marketingOptIn: true,
  locale: 'en',
  ...over,
});

test('stores a normalized signup', async () => {
  const r = await saveDeliverySignup(t.db, input(), ctx());
  expect(r.ok).toBe(true);
  const [row] = await t.db.select().from(deliverySignups);
  expect(row).toMatchObject({
    name: 'Maya Khoury',
    email: 'maya@example.com',
    phone: '+9613123456',
    marketingOptIn: true,
    locale: 'en',
    ipHash: 'h',
  });
});

test('the same email signs up once; later details win', async () => {
  const first = await saveDeliverySignup(t.db, input(), ctx());
  const again = await saveDeliverySignup(t.db, input({ name: 'Maya K.', marketingOptIn: false }), ctx());
  expect(first.ok && again.ok && again.id === first.id).toBe(true);
  const rows = await t.db.select().from(deliverySignups);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ name: 'Maya K.', marketingOptIn: false });
});

test('rejects a bad email, phone or name', async () => {
  expect(await saveDeliverySignup(t.db, input({ email: 'not-an-email' }), ctx())).toEqual({
    ok: false,
    fieldErrors: { email: 'invalid_email' },
  });
  expect(await saveDeliverySignup(t.db, input({ phone: '12' }), ctx())).toEqual({
    ok: false,
    fieldErrors: { phone: 'invalid_phone' },
  });
  expect(await saveDeliverySignup(t.db, input({ name: ' ' }), ctx())).toEqual({
    ok: false,
    fieldErrors: { name: 'required' },
  });
  expect(await t.db.select().from(deliverySignups)).toHaveLength(0);
});

test('lists newest first and exports CSV without spreadsheet formulas', async () => {
  await saveDeliverySignup(t.db, input({ email: 'a@x.com', name: '=HYPERLINK("x")' }), ctx(new Date('2026-10-01T08:00:00Z')));
  await saveDeliverySignup(t.db, input({ email: 'b@x.com', marketingOptIn: false }), ctx(new Date('2026-10-02T08:00:00Z')));
  const rows = await listDeliverySignups(t.db, { limit: 50, offset: 0 });
  expect(rows.map((r) => r.email)).toEqual(['b@x.com', 'a@x.com']);

  const csv = deliverySignupsToCsv(rows).split('\r\n');
  expect(csv[0]).toBe('Date,Name,Email,Phone,Offers OK,Language');
  expect(csv[1]).toContain(',b@x.com,03 123 456,No,en');
  expect(csv[2]).toContain(`"'=HYPERLINK(""x"")"`);
  expect(csv[2]).toContain(',Yes,');
});
