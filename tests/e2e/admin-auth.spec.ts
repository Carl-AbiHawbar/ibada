import { expect, test } from '@playwright/test';
import { OWNER, enterCode, freshCode, ownerSecret, signInWithPassword } from './helpers';

test('admin pages need a session', async ({ page }) => {
  await page.goto('/admin/orders');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('the auth API refuses public sign-up', async ({ request }) => {
  const res = await request.post('/api/auth/sign-up/email', {
    data: { email: 'intruder@example.com', password: 'intruder-password-1', name: 'X' },
    headers: { origin: 'http://localhost:3100' },
  });
  expect(res.status()).toBeGreaterThanOrEqual(400);
});

test('wrong password is refused', async ({ page }) => {
  await signInWithPassword(page, OWNER.email, 'not-the-password');
  await expect(page.getByText('Wrong email or password')).toBeVisible();
});

test('owner signs in with password then authenticator code', async ({ page }) => {
  const secret = ownerSecret();
  test.skip(!secret, 'setup project enrolls the authenticator first');
  await signInWithPassword(page, OWNER.email, OWNER.password);
  await enterCode(page, await freshCode(secret!));
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible();
});

test('a wrong authenticator code is refused', async ({ page }) => {
  await signInWithPassword(page, OWNER.email, OWNER.password);
  await enterCode(page, '000000');
  await expect(page.getByText('That code is not correct.')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/two-factor$/);
});
