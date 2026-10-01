import { expect, test } from '@playwright/test';
import { OWNER_STATE, placeStorefrontOrder, randomPhone } from './helpers';

test.use({ storageState: OWNER_STATE });

test.describe.serial('customers, discounts and reviews', () => {
  const tag = `${Date.now() % 100000}${Math.floor(Math.random() * 90 + 10)}`;
  const buyer = `Client ${tag}`;
  const phone = randomPhone('78');

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    await placeStorefrontOrder(await ctx.newPage(), buyer, phone);
    await ctx.close();
  });

  test('create a discount code', async ({ page }) => {
    await page.goto('/admin/discounts');
    await page.getByRole('button', { name: 'New discount' }).click();
    await page.getByLabel('Code').fill(`summer${tag}`);
    await page.getByLabel('Type').selectOption('percent');
    await page.getByLabel('Amount').fill('15');
    await page.getByRole('button', { name: 'Save discount' }).click();
    const row = page.getByTestId('discount-row').filter({ hasText: `SUMMER${tag}` });
    await expect(row).toContainText('15%');
    await expect(row).toContainText('0 used');
  });

  test('a visible review shows on the storefront, then goes away when deleted', async ({ page }) => {
    const text = `Works great in our kitchen ${tag}`;
    await page.goto('/admin/reviews');
    await page.getByRole('button', { name: 'Add review' }).click();
    await page.getByLabel('Customer name').fill('Rana');
    await page.getByLabel('Rating').selectOption('5');
    await page.getByLabel('Review').fill(text);
    await page.getByRole('button', { name: 'Save review' }).click();
    await expect(page.getByTestId('review-row').filter({ hasText: text })).toBeVisible();

    await page.goto('/en');
    await expect(page.getByTestId('rating-summary')).toContainText('5.0');
    await expect(page.getByText(text)).toBeVisible();

    await page.goto('/admin/reviews');
    const row = page.getByTestId('review-row').filter({ hasText: text });
    await row.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete review' }).click();
    await expect(page.getByTestId('review-row').filter({ hasText: text })).toHaveCount(0);
  });

  test('block and unblock a customer', async ({ page }) => {
    await page.goto(`/admin/customers?q=${encodeURIComponent(buyer)}`);
    await page.getByTestId('customer-row').filter({ hasText: buyer }).getByRole('link').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(buyer);
    await expect(page.getByTestId('customer-orders')).toContainText('$35.99');

    await page.getByRole('button', { name: 'Block customer' }).click();
    await page.getByLabel('Reason').fill('Test block');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Block' }).click();
    await expect(page.getByTestId('blocked-badge')).toContainText('Blocked');

    await page.getByRole('button', { name: 'Unblock' }).click();
    await expect(page.getByTestId('blocked-badge')).toHaveCount(0);
  });
});
