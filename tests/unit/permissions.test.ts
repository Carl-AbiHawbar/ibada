import { expect, test } from 'vitest';
import { can } from '@/lib/permissions';

test('only owners reach discounts, settings, staff, activity and subscribers', () => {
  for (const area of ['discounts', 'settings', 'staff', 'activity', 'subscribers'] as const) {
    expect(can('staff', area)).toBe(false);
    expect(can('owner', area)).toBe(true);
  }
});

test('staff reach day-to-day areas', () => {
  for (const area of ['home', 'orders', 'products', 'inventory', 'customers', 'reviews', 'notifications', 'account'] as const) {
    expect(can('staff', area)).toBe(true);
    expect(can('owner', area)).toBe(true);
  }
});
