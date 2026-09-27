import { expect, test } from 'vitest';
import { authorize } from '@/server/auth/authorize';

const staff = { id: 'u', role: 'staff', active: true, twoFactorEnabled: true } as const;

test('no session means login', () => {
  expect(authorize(null, 'orders')).toBe('login');
});

test('a deactivated user is logged out even with a live session', () => {
  expect(authorize({ ...staff, active: false }, 'orders')).toBe('login');
});

test('2FA is mandatory before anything else', () => {
  expect(authorize({ ...staff, twoFactorEnabled: false }, 'orders')).toBe('setup-2fa');
  expect(authorize({ ...staff, role: 'owner', twoFactorEnabled: false }, 'settings')).toBe('setup-2fa');
});

test('role gates owner-only areas', () => {
  expect(authorize(staff, 'settings')).toBe('forbidden');
  expect(authorize(staff, 'orders')).toBe('ok');
  expect(authorize({ ...staff, role: 'owner' }, 'settings')).toBe('ok');
});
