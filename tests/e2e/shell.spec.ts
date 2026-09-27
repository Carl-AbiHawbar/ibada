import { expect, test } from '@playwright/test';

test('root redirects to /en', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/en$/);
});

test('arabic is rtl', async ({ page }) => {
  await page.goto('/ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});

test('english is ltr', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

test('language switch keeps the path', async ({ page }) => {
  await page.goto('/en/shop');
  await page.getByTestId('lang-switch').click();
  await expect(page).toHaveURL(/\/ar\/shop$/);
  await page.getByTestId('lang-switch').click();
  await expect(page).toHaveURL(/\/en\/shop$/);
});

test('announcement bar and logo render', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByTestId('announcement')).toContainText('Cash on delivery');
  await expect(page.getByRole('link', { name: 'IBADA home' })).toBeVisible();
});

test('unknown pages show the localized 404', async ({ page }) => {
  const res = await page.goto('/ar/nope-not-here');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'الصفحة غير موجودة' })).toBeVisible();
});
