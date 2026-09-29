import { expect, test } from 'vitest';
import { navItemsFor } from '@/components/admin/nav-items';

test('staff see only day-to-day areas', () => {
  expect(navItemsFor('staff').map((i) => i.area)).toEqual([
    'home',
    'orders',
    'products',
    'customers',
    'inventory',
    'reviews',
    'notifications',
    'account',
  ]);
});

test('owners see everything', () => {
  expect(navItemsFor('owner')).toHaveLength(13);
  expect(navItemsFor('owner').map((i) => i.area)).toEqual(
    expect.arrayContaining(['discounts', 'settings', 'staff', 'activity', 'subscribers']),
  );
});

test('phone tab bar holds the four busiest areas', () => {
  expect(navItemsFor('owner').filter((i) => i.mobile === 'tab').map((i) => i.href)).toEqual([
    '/admin',
    '/admin/orders',
    '/admin/products',
    '/admin/customers',
  ]);
});
