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
  phone: '03 123 456',
  marketingOptIn: true,
  pests: ['cockroaches', 'mosquitoes'],
  locale: 'en',
  ...over,
});

test('stores a normalized signup without an email', async () => {
  const r = await saveDeliverySignup(t.db, input(), ctx());
  expect(r.ok).toBe(true);
  const [row] = await t.db.select().from(deliverySignups);
  expect(row).toMatchObject({
    name: 'Maya Khoury',
    email: null,
    phone: '+9613123456',
    marketingOptIn: true,
    pests: ['cockroaches', 'mosquitoes'],
    locale: 'en',
    ipHash: 'h',
  });
});

test('the same phone signs up once; later details win', async () => {
  const first = await saveDeliverySignup(t.db, input(), ctx());
  const again = await saveDeliverySignup(t.db, input({ phone: '+961 3 123 456', name: 'Maya K.', marketingOptIn: false }), ctx());
  expect(first.ok && again.ok && again.id === first.id).toBe(true);
  const rows = await t.db.select().from(deliverySignups);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ name: 'Maya K.', marketingOptIn: false });
});

test('an email is still accepted when given, and kept on later signups without one', async () => {
  await saveDeliverySignup(t.db, input({ email: '  Maya@Example.com ' }), ctx());
  await saveDeliverySignup(t.db, input({ name: 'Maya K.' }), ctx());
  const [row] = await t.db.select().from(deliverySignups);
  expect(row).toMatchObject({ email: 'maya@example.com', name: 'Maya K.' });
  expect(await saveDeliverySignup(t.db, input({ email: 'not-an-email' }), ctx())).toEqual({
    ok: false,
    fieldErrors: { email: 'invalid_email' },
  });
});

test('pests are optional, deduplicated and limited to the known choices', async () => {
  await saveDeliverySignup(t.db, input({ phone: '70 111 111', pests: ['ants', 'ants'] }), ctx());
  await saveDeliverySignup(t.db, input({ phone: '70 222 222', pests: undefined }), ctx());
  const rows = await t.db.select().from(deliverySignups);
  expect(rows.map((r) => r.pests)).toEqual([['ants'], []]);
  expect(await saveDeliverySignup(t.db, input({ phone: '70 333 333', pests: ['dragons'] }), ctx())).toEqual({
    ok: false,
    fieldErrors: { pests: 'invalid_pests' },
  });
});

test('rejects a bad phone or name', async () => {
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
  await saveDeliverySignup(t.db, input({ phone: '70 111 111', name: '=HYPERLINK("x")' }), ctx(new Date('2026-10-01T08:00:00Z')));
  await saveDeliverySignup(t.db, input({ phone: '70 222 222', marketingOptIn: false }), ctx(new Date('2026-10-02T08:00:00Z')));
  const rows = await listDeliverySignups(t.db, { limit: 50, offset: 0 });
  expect(rows.map((r) => r.phone)).toEqual(['+96170222222', '+96170111111']);

  const csv = deliverySignupsToCsv(rows).split('\r\n');
  expect(csv[0]).toBe('Date,Name,Phone,Email,Pests,WhatsApp offers,Language');
  expect(csv[1]).toContain(',70 222 222,,Cockroaches; Mosquitoes,No,en');
  expect(csv[2]).toContain(`"'=HYPERLINK(""x"")"`);
  expect(csv[2]).toContain(',Yes,');
});
