import { expect, test } from '@playwright/test';
import { OWNER_STATE } from './helpers';

test('the admin preview link shows labelled sample reviews to that browser only', async ({ browser }) => {
  const admin = await (await browser.newContext({ storageState: OWNER_STATE })).newPage();
  await admin.goto('/admin/reviews');
  const href = await admin.getByTestId('preview-link').getByRole('link', { name: 'Open preview' }).getAttribute('href');
  expect(href).toContain('/api/preview?token=');

  const viewer = await (await browser.newContext()).newPage();
  await viewer.goto(new URL(href!).pathname + new URL(href!).search);
  await expect(viewer).toHaveURL(/\/en$/);
  await expect(viewer.getByTestId('preview-banner')).toBeVisible();
  const badge = viewer.getByTestId('rating-summary');
  await expect(badge).toContainText('4.8');
  await expect(badge).toContainText('Sample');
  await expect(viewer.locator('#reviews')).toContainText('Rania K.');

  // Everyone else sees the shop without samples.
  const shopper = await (await browser.newContext()).newPage();
  await shopper.goto('/en');
  await expect(shopper.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(shopper.getByTestId('rating-summary')).toHaveCount(0);
  await expect(shopper.getByTestId('preview-banner')).toHaveCount(0);

  await viewer.getByRole('link', { name: 'Exit preview' }).click();
  await expect(viewer.getByTestId('preview-banner')).toHaveCount(0);
  await expect(viewer.getByTestId('rating-summary')).toHaveCount(0);
});

test('a forged preview link does nothing', async ({ page }) => {
  await page.goto('/api/preview?token=storefront-preview.9999999999.forged');
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByTestId('preview-banner')).toHaveCount(0);
});
