import { vi } from 'vitest';
import type { PlaceOrderContext } from '@/server/orders/place-order';

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
