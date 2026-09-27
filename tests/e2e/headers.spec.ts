import { expect, test } from '@playwright/test';

test('storefront pages carry security headers and a static CSP', async ({ request }) => {
  const h = (await request.get('/en')).headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['content-security-policy']).toContain("'unsafe-inline'");
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['x-powered-by']).toBeUndefined();
});

test('admin and checkout use a per-request nonce CSP', async ({ request }) => {
  const admin = (await request.get('/admin/login')).headers()['content-security-policy'];
  expect(admin).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(admin).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  const checkout = (await request.get('/en/checkout')).headers()['content-security-policy'];
  expect(checkout).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  const again = (await request.get('/en/checkout')).headers()['content-security-policy'];
  expect(again).not.toBe(checkout); // fresh nonce every request
});

test('checkout still works under the strict CSP', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Content-Security-Policy/i.test(m.text())) violations.push(m.text());
  });
  await page.goto('/en');
  await page.getByRole('button', { name: 'ADD TO CART' }).first().click();
  await page.getByRole('dialog').getByRole('link', { name: 'Checkout' }).click();
  await page.getByLabel('Full name').fill('CSP Buyer');
  await page.getByLabel('Phone').fill(`71 ${String(Math.floor(100000 + Math.random() * 899999))}`);
  await page.getByLabel('Governorate').selectOption('beirut');
  await page.getByLabel('District').selectOption('beirut');
  await page.getByLabel('Town / city').fill('Hamra');
  await page.getByLabel('Address details').fill('Bliss st, Bldg 7, 4th floor');
  await page.getByRole('button', { name: 'PLACE ORDER' }).click();
  await expect(page).toHaveURL(/\/en\/order\/\d+$/, { timeout: 20_000 });
  expect(violations).toEqual([]);
});

// A statically pre-rendered page has no nonce on its scripts, so the strict CSP blocks all of them.
test('every public admin page runs its scripts under the strict CSP', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Content-Security-Policy/i.test(m.text())) violations.push(`${page.url()}: ${m.text()}`);
  });
  for (const path of ['/admin/login', '/admin/two-factor']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
  expect(violations).toEqual([]);
});

test('admin works under the strict CSP', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Content-Security-Policy/i.test(m.text())) violations.push(m.text());
  });
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill('nobody@ibada.test');
  await page.getByLabel('Password').fill('wrong-password-1');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Wrong email or password')).toBeVisible();
  expect(violations).toEqual([]);
});
