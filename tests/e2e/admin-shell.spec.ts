import { expect, test } from '@playwright/test';
import { OWNER_STATE } from './helpers';

test.use({ storageState: OWNER_STATE });

test('manifest makes the admin installable', async ({ request }) => {
  const res = await request.get('/admin/manifest.webmanifest');
  expect(res.headers()['content-type']).toContain('application/manifest+json');
  const m = await res.json();
  expect(m).toMatchObject({ scope: '/admin/', start_url: '/admin', display: 'standalone', theme_color: '#012755' });
  expect(m.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose ?? 'any'}`)).toEqual(
    expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']),
  );
});

test('service worker is served with push handling', async ({ request }) => {
  const res = await request.get('/admin/sw.js');
  expect(res.status()).toBe(200);
  expect(res.headers()['cache-control']).toContain('no-cache');
  expect(await res.text()).toContain("addEventListener('push'");
});

test('navigation adapts to the screen', async ({ page, isMobile }) => {
  await page.goto('/admin');
  if (isMobile) {
    await expect(page.getByTestId('bottom-tabs')).toBeVisible();
    await expect(page.getByTestId('sidebar')).toBeHidden();
    await page.getByTestId('bottom-tabs').getByRole('button', { name: 'More' }).click();
    await expect(page.getByRole('dialog').getByRole('link', { name: 'Settings' })).toBeVisible();
  } else {
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('bottom-tabs')).toBeHidden();
    await expect(page.getByTestId('sidebar').getByRole('link', { name: 'Settings' })).toBeVisible();
  }
});

test.describe('before notifications are allowed', () => {
  // The headless test browser always reports "denied"; simulate a phone that hasn't been asked yet.
  // Real push delivery is verified manually on a phone (docs/DEPLOY.md launch checklist).
  test('notifications page offers enabling on this device', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(Notification, 'permission', { get: () => 'default' }));
    await page.goto('/admin/notifications');
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enable notifications on this device' })).toBeVisible();
  });
});

test('blocked notifications explain how to re-enable them', async ({ page }) => {
  await page.goto('/admin/notifications');
  await expect(page.getByText('Notifications are blocked for this site')).toBeVisible();
});

test('account page shows security options', async ({ page }) => {
  await page.goto('/admin/account');
  await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out other devices' })).toBeVisible();
});
