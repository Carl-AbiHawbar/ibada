import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { OWNER_STATE } from './helpers';

test.use({ storageState: OWNER_STATE });

async function openIbadaOne(page: import('@playwright/test').Page) {
  await page.goto('/admin/products');
  await page.getByRole('link', { name: /IBADA ONE/ }).first().click();
  await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
}

async function setSinglePrice(page: import('@playwright/test').Page, price: string) {
  await page.getByTestId('bundle-row-Single Room Protection').getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Price (USD)', { exact: true }).fill(price);
  await page.getByRole('button', { name: 'Save bundle' }).click();
  await expect(page.getByText('Bundle saved')).toBeVisible();
}

test.describe.serial('products', () => {
  test('bundle price edit shows on the storefront', async ({ page }) => {
    await openIbadaOne(page);
    await setSinglePrice(page, '22');

    await page.goto('/en');
    await page.getByTestId('bundle-option').filter({ hasText: 'Single Room Protection' }).click();
    await expect(page.getByTestId('price-block')).toContainText('$22');
    await expect(page.getByTestId('price-block')).toContainText('Save 27%');

    // Put the pricing sheet back for the other specs.
    await openIbadaOne(page);
    await setSinglePrice(page, '20');
  });

  test('the "was" price must be above the price', async ({ page }) => {
    await openIbadaOne(page);
    await page.getByTestId('bundle-row-Family Pack').getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Was price (USD)').fill('40');
    await page.getByRole('button', { name: 'Save bundle' }).click();
    await expect(page.getByText('The "was" price must be higher than the price')).toBeVisible();
  });

  test('upload a photo', async ({ page }) => {
    await openIbadaOne(page);
    const before = await page.getByTestId('media-item').count();
    const png = await sharp({ create: { width: 600, height: 600, channels: 3, background: '#dceefb' } }).png().toBuffer();
    await page.getByLabel('Upload photos').setInputFiles({ name: 'lifestyle.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByTestId('media-item')).toHaveCount(before + 1);
    const src = await page.getByTestId('media-item').last().locator('img').getAttribute('src');
    expect(src).toContain('uploads');

    await page.getByTestId('media-item').last().getByRole('button', { name: 'Delete photo' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete photo' }).click();
    await expect(page.getByTestId('media-item')).toHaveCount(before);
  });

  test('stock adjustment is logged', async ({ page }) => {
    await page.goto('/admin/inventory');
    const card = page.getByTestId('stock-card').filter({ hasText: 'IBADA ONE' });
    const before = Number(await card.getByTestId('stock-units').textContent());
    await card.getByLabel('Change (+/−)').fill('10');
    await card.getByLabel('Reason').fill('New shipment');
    await card.getByRole('button', { name: 'Apply' }).click();
    await expect(card.getByTestId('stock-units')).toHaveText(String(before + 10));
    await expect(card.getByTestId('movements')).toContainText('+10');
    await expect(card.getByTestId('movements')).toContainText('New shipment');
  });
});
