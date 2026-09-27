import { vi } from 'vitest';
import type { Db } from '@/server/db/client';
import { user } from '@/server/db/schema';
import { placeOrder, type PlaceOrderContext } from '@/server/orders/place-order';

let ipCounter = 0;

/** Place an order through the real domain code from a fresh IP; throws if it fails. */
export async function placeTestOrder(db: Db, bundleId: string, over: Record<string, unknown> = {}) {
  ipCounter += 1;
  const r = await placeOrder(db, checkoutInput(bundleId, over), orderContext({ ip: `10.0.${ipCounter >> 8}.${ipCounter & 255}` }));
  if (!r.ok) throw new Error(`placeTestOrder failed: ${JSON.stringify(r)}`);
  return r;
}

/** Insert an admin user row directly (auth is covered separately). */
export async function insertStaff(db: Db, over: Partial<typeof user.$inferInsert> = {}) {
  const id = over.id ?? crypto.randomUUID();
  await db.insert(user).values({
    id,
    name: 'Owner',
    email: `${id}@ibada.test`,
    role: 'owner',
    twoFactorEnabled: true,
    ...over,
  });
  return id;
}

/** A valid checkout payload for Multi-Room ×1 to Beirut; override any field. */
export function checkoutInput(bundleId: string, over: Record<string, unknown> = {}) {
  return {
    idempotencyKey: crypto.randomUUID(),
    locale: 'en',
    cart: [{ bundleId, quantity: 1 }],
    name: 'Ali Haddad',
    phone: '03 123 456',
    governorate: 'beirut',
    district: 'beirut',
    town: 'Beirut',
    addressLine: 'Hamra street, Bldg 5, 2nd floor',
    landmark: 'Near the pharmacy',
    notes: '',
    turnstileToken: 'tok',
    ...over,
  };
}

export function orderContext(over: Partial<PlaceOrderContext> = {}): PlaceOrderContext {
  return {
    ip: '1.1.1.1',
    sessionId: 's1',
    now: new Date('2026-09-27T10:00:00Z'),
    verifyTurnstile: vi.fn(async () => true),
    notify: vi.fn(async () => {}),
    ...over,
  };
}
