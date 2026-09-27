import { expect, test, type Page } from '@playwright/test';
import { OWNER_STATE } from './helpers';

test.use({ storageState: OWNER_STATE });

/** Place a real order through the storefront with a unique buyer name. */
async function placeOrder(page: Page, name: string, phone: string) {
  await page.goto('/en');
  await page.getByRole('button', { name: 'ADD TO CART' }).first().click();
  await page.getByRole('dialog').getByRole('link', { name: 'Checkout' }).click();
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Phone').fill(phone);
  await page.getByLabel('Governorate').selectOption('beirut');
  await page.getByLabel('District').selectOption('beirut');
  await page.getByLabel('Town / city').fill('Hamra');
  await page.getByLabel('Address details').fill('Bliss st, Bldg 7, 4th floor');
  await page.getByLabel('Nearby landmark (optional)').fill('Opposite the bakery');
  await page.getByRole('button', { name: 'PLACE ORDER' }).click();
  await expect(page).toHaveURL(/\/en\/order\/\d+$/, { timeout: 20_000 });
  return page.url().split('/').pop()!;
}

test.describe.serial('orders', () => {
  const tag = `${Date.now() % 100000}${Math.floor(Math.random() * 90 + 10)}`;
  const buyer = `Buyer ${tag}`;
  let number = '';
  let phone = '';

  test.beforeAll(async ({ browser }) => {
    // Runs share one database (and the server may be reused), so use fresh numbers each time.
    const six = () => String(Math.floor(100000 + Math.random() * 899999));
    phone = `71 ${six()}`;
    const phoneB = `76 ${six()}`;
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    number = await placeOrder(page, buyer, phone);
    await placeOrder(page, `${buyer} B`, phoneB);
    await ctx.close();
  });

  test('new order is listed and can be confirmed with a note', async ({ page }) => {
    await page.goto('/admin/orders?status=new');
    const row = page.getByTestId('order-row').filter({ hasText: `#${number}` });
    await expect(row).toContainText(buyer);
    await expect(row).toContainText('$36');
    await row.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/admin\/orders\/[0-9a-f-]{36}$/);

    await page.getByRole('button', { name: 'Confirm order' }).click();
    await expect(page.getByTestId('order-status')).toHaveText('Confirmed');
    await expect(page.getByTestId('timeline')).toContainText('New → Confirmed');

    await page.getByLabel('Add a note').fill('Called, delivering tomorrow');
    await page.getByRole('button', { name: 'Save note' }).click();
    await expect(page.getByTestId('timeline')).toContainText('Called, delivering tomorrow');
  });

  test('search by phone', async ({ page }) => {
    await page.goto('/admin/orders');
    await page.getByLabel('Search orders').fill(phone);
    await expect(page).toHaveURL(/q=71/);
    await expect(page.getByTestId('order-row')).toHaveCount(1);
    await expect(page.getByTestId('order-row')).toContainText(buyer);
  });

  test('bulk mark out for delivery', async ({ page }) => {
    await page.goto(`/admin/orders?q=${encodeURIComponent(buyer)}`);
    await expect(page.getByTestId('order-row')).toHaveCount(2);
    // Confirm the second order first so both can move to "Out for delivery".
    await page.getByTestId('order-row').filter({ hasText: `${buyer} B` }).getByRole('checkbox').check();
    await page.getByTestId('bulk-bar').getByRole('button', { name: 'Confirmed' }).click();
    await expect(page.getByText('1 order updated')).toBeVisible();

    for (const r of await page.getByTestId('order-row').all()) await r.getByRole('checkbox').check();
    await page.getByTestId('bulk-bar').getByRole('button', { name: 'Out for delivery' }).click();
    await expect(page.getByText('2 orders updated')).toBeVisible();
  });

  test('cancel asks for confirmation and restocks', async ({ page }) => {
    await page.goto(`/admin/orders?q=${encodeURIComponent(`${buyer} B`)}`);
    await page.getByTestId('order-row').first().getByRole('link').first().click();
    await page.getByRole('button', { name: 'Cancel order' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('put back in stock');
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel order' }).click();
    await expect(page.getByTestId('order-status')).toHaveText('Cancelled');
  });

  test('delivery slip shows the cash to collect', async ({ page }) => {
    await page.goto(`/admin/orders?q=${number}`);
    const id = (await page.getByTestId('order-row').first().getAttribute('data-id'))!;
    await page.goto(`/admin/print/orders?ids=${id}&format=a4`);
    await expect(page.getByText('COD amount: $36.00')).toBeVisible();
    await expect(page.getByText('Opposite the bakery')).toBeVisible();
  });

  test('csv export', async ({ page }) => {
    await page.goto('/admin/orders');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Export CSV' }).click()]);
    const body = await (await download.createReadStream())!.toArray();
    const text = Buffer.concat(body).toString('utf8').replace(/^﻿/, '');
    expect(text.split('\r\n')[0]).toBe('Order,Date,Status,Name,Phone,Governorate,District,Town,Address,Landmark,Notes,Items,Total USD');
    expect(text).toContain(buyer);
  });
});
