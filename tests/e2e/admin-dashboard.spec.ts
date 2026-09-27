import { expect, test } from '@playwright/test';
import { OWNER_STATE, placeStorefrontOrder, randomPhone } from './helpers';

test.use({ storageState: OWNER_STATE });

test('dashboard shows sales, the chart and latest orders', async ({ page, browser }) => {
  const ctx = await browser.newContext();
  const number = await placeStorefrontOrder(await ctx.newPage(), 'Dash Buyer', randomPhone('70'));
  await ctx.close();

  await page.goto('/admin?range=today');
  await expect(page.getByTestId('stat-sales')).toContainText('$');
  await expect(page.locator('.recharts-surface').first()).toBeVisible();
  await expect(page.getByTestId('latest-orders')).toContainText(`#${number}`);
  await page.getByText('Show as table').click();
  await expect(page.locator('table')).toContainText('Sales');
});

test('custom range and presets', async ({ page }) => {
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Custom' }).click();
  await page.getByLabel('Start date', { exact: true }).fill('2026-09-01');
  await page.getByLabel('End date', { exact: true }).fill('2026-09-03');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/from=2026-09-01&to=2026-09-03/);
  await expect(page.getByText('2026-09-01 → 2026-09-03')).toBeVisible();
  await page.getByRole('link', { name: '30 days' }).click();
  await expect(page.getByText('Last 30 days')).toBeVisible();
});
