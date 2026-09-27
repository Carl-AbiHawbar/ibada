import { expect, test } from 'vitest';
import { canTransition, nextStatuses } from '@/lib/order-status';

test('allowed next statuses follow the spec arrows', () => {
  expect(nextStatuses('new')).toEqual(['confirmed', 'cancelled']);
  expect(nextStatuses('confirmed')).toEqual(['out_for_delivery', 'cancelled']);
  expect(nextStatuses('out_for_delivery')).toEqual(['delivered', 'cancelled']);
  expect(nextStatuses('delivered')).toEqual(['returned']);
  expect(nextStatuses('cancelled')).toEqual([]);
  expect(nextStatuses('returned')).toEqual([]);
});

test('skipping or reversing steps is not allowed', () => {
  expect(canTransition('new', 'delivered')).toBe(false);
  expect(canTransition('delivered', 'cancelled')).toBe(false);
  expect(canTransition('confirmed', 'new')).toBe(false);
  expect(canTransition('new', 'new')).toBe(false);
  expect(canTransition('out_for_delivery', 'delivered')).toBe(true);
});
