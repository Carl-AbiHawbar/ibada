import { expect, test } from '@playwright/test';

test('add, change, remove and persist', async ({ page }) => {
  await page.goto('/en');
  await page.getByTestId('bundle-option').filter({ hasText: 'Family Pack' }).click();
  await page.getByRole('button', { name: 'ADD TO CART' }).first().click();

  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('Family Pack');
  await expect(drawer.getByTestId('cart-subtotal')).toHaveText('$50.99');
  await expect(drawer.getByTestId('cart-delivery')).toHaveText('FREE');
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await drawer.getByRole('button', { name: 'Increase quantity' }).click();
  await expect(drawer.getByTestId('cart-subtotal')).toHaveText('$101.98');
  await expect(page.getByTestId('cart-count')).toHaveText('2');

  await page.reload();
  await page.getByTestId('cart-button').click();
  await expect(page.getByRole('dialog').getByTestId('cart-subtotal')).toHaveText('$101.98');

  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('dialog')).toContainText('Your cart is empty');
  await expect(page.getByTestId('cart-count')).toHaveCount(0);
});

test('stale cart is repaired', async ({ page }) => {
  await page.goto('/en');
  await page.evaluate(() =>
    localStorage.setItem('ibada_cart_v1', JSON.stringify([{ bundleId: '00000000-0000-4000-8000-000000000000', quantity: 1 }])),
  );
  await page.reload();
  await page.getByTestId('cart-button').click();
  await expect(page.getByText('Some items are no longer available')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Your cart is empty');
  expect(await page.evaluate(() => localStorage.getItem('ibada_cart_v1'))).toBe('[]');
});

test('arabic drawer opens from the start side', async ({ page }) => {
  await page.goto('/ar');
  await page.getByRole('button', { name: 'أضف إلى السلة' }).first().click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toContainText('حماية عدة غرف');
  const box = await drawer.boundingBox();
  expect(box!.x).toBeLessThan(5); // anchored to the left edge in RTL
});

test('funnel events are accepted and set an anonymous session cookie', async ({ request }) => {
  const res = await request.post('/api/events', { data: { type: 'view_product', locale: 'en' } });
  expect(res.status()).toBe(204);
  expect(res.headers()['set-cookie']).toMatch(/ibada_sid=[0-9a-f-]{36}; .*HttpOnly/i);
  expect((await request.post('/api/events', { data: { type: 'order_placed', locale: 'en' } })).status()).toBe(400);
  expect((await request.post('/api/events', { data: 'junk' })).status()).toBe(400);
});

test('cart shows the old price and offers an upgrade to the next pack', async ({ page }) => {
  await page.goto('/en');
  await page.getByTestId('bundle-option').filter({ hasText: 'Single Room Protection' }).click();
  await page.getByRole('button', { name: 'ADD TO CART' }).first().click();
  const drawer = page.getByRole('dialog');
  await expect(drawer.getByTestId('cart-subtotal')).toHaveText('$19.99');
  await expect(drawer.locator('s').filter({ hasText: '$30' })).toBeVisible();
  const upgrade = drawer.getByTestId('cart-upgrade');
  await expect(upgrade).toContainText('Make it Multi-Room Protection');
  await upgrade.getByRole('button', { name: 'Upgrade for +$16' }).click();
  await expect(drawer).toContainText('Multi-Room Protection');
  await expect(drawer.getByTestId('cart-subtotal')).toHaveText('$35.99');
  // The next suggestion is the pack after that.
  await expect(drawer.getByTestId('cart-upgrade')).toContainText('Make it Family Pack');
  await expect(drawer.getByTestId('cart-total')).toHaveText('$35.99');
});
