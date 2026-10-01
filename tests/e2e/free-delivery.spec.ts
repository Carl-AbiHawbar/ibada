import { expect, test, type Page } from '@playwright/test';
import { OWNER_STATE } from './helpers';

async function setDeliveryFee(page: Page, usd: string) {
  await page.goto('/admin/settings');
  await page.getByLabel('Delivery fee (USD)').fill(usd);
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Settings saved')).toBeVisible();
}

test('the free-delivery form removes the delivery fee', async ({ browser }) => {
  const admin = await browser.newContext({ storageState: OWNER_STATE });
  const adminPage = await admin.newPage();
  await setDeliveryFee(adminPage, '3');
  try {
    const shopper = await (await browser.newContext()).newPage();
    await shopper.goto('/en');
    await shopper.getByRole('button', { name: 'ADD TO CART' }).first().click();
    const drawer = shopper.getByRole('dialog');
    await expect(drawer.getByTestId('cart-delivery')).toHaveText('$3');

    await drawer.getByTestId('cart-delivery-get-free').click();
    const form = shopper.getByRole('dialog', { name: 'Get free delivery forever!' });
    await form.getByLabel('First name', { exact: true }).fill('Rana Test');
    await form.getByLabel('Email', { exact: true }).fill(`rana+${Date.now()}@example.com`);
    await form.getByLabel('Phone Number', { exact: true }).fill('71 234 567');
    await form.getByText('Cockroaches').click();
    await form.getByLabel(/offers on WhatsApp/).check();
    await form.getByRole('button', { name: 'Claim my free delivery' }).click();
    await expect(shopper.getByTestId('free-delivery-done')).toBeVisible();
    await shopper.getByRole('button', { name: 'Continue shopping' }).click();

    await shopper.goto('/en/checkout');
    await expect(shopper.getByTestId('summary-delivery')).toHaveText('FREE');
    await expect(shopper.getByTestId('summary-total')).toHaveText('$35.99');
    await expect(shopper.getByTestId('free-delivery-button')).toHaveCount(0);

    await adminPage.goto('/admin/subscribers');
    await expect(adminPage.getByTestId('subscriber-row').filter({ hasText: 'Rana Test' }).first()).toContainText('WhatsApp OK');
    await expect(adminPage.getByTestId('subscriber-row').filter({ hasText: 'Rana Test' }).first()).toContainText('Pests: Cockroaches');
  } finally {
    await setDeliveryFee(adminPage, '0');
    await admin.close();
  }
});

test('the floating button opens the form and shows field errors', async ({ browser }) => {
  const admin = await browser.newContext({ storageState: OWNER_STATE });
  const adminPage = await admin.newPage();
  await setDeliveryFee(adminPage, '3');
  try {
    const shopper = await (await browser.newContext()).newPage();
    await shopper.goto('/en/shop');
    await shopper.getByTestId('free-delivery-button').click();
    const form = shopper.getByRole('dialog', { name: 'Get free delivery forever!' });
    await form.getByLabel('First name', { exact: true }).fill('Test');
    await form.getByLabel('Email', { exact: true }).fill('nope');
    await form.getByLabel('Phone Number', { exact: true }).fill('12');
    await form.getByRole('button', { name: 'Claim my free delivery' }).click();
    await expect(form.getByText('Enter a valid email address')).toBeVisible();
    await expect(form.getByText('Enter a Lebanese number, e.g. 03 123 456')).toBeVisible();
  } finally {
    await setDeliveryFee(adminPage, '0');
    await admin.close();
  }
});

test('no free-delivery button while delivery is free for everyone', async ({ page }) => {
  await page.goto('/en/shop');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('free-delivery-button')).toHaveCount(0);
});
