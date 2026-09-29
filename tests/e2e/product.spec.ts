import { expect, test } from '@playwright/test';

test('bundle picker drives the price', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('radio')).toHaveCount(4);
  await expect(page.getByRole('radio', { name: /Multi-Room Protection/ })).toBeChecked();

  const price = page.getByTestId('price-block');
  await expect(price).toContainText('$36');
  await expect(price).toContainText('$60');
  await expect(price).toContainText('Save 40%');

  await page.getByTestId('bundle-option').filter({ hasText: 'Family Pack' }).click();
  await expect(page.getByRole('radio', { name: /Family Pack/ })).toBeChecked();
  await expect(price).toContainText('$51');
  await expect(price).toContainText('Save 43%');
  await expect(page.getByTestId('bundle-option').filter({ hasText: 'Family Pack' })).toContainText('$17 / unit');
  await expect(page.getByTestId('bundle-option').filter({ hasText: 'Full Home Protection' })).toContainText('BEST VALUE');
});

test('no rating block without reviews', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByTestId('rating-summary')).toHaveCount(0);
  await expect(page.locator('#reviews')).toHaveCount(0);
});

test('sticky add-to-cart bar appears after scrolling past the button', async ({ page }) => {
  await page.goto('/en');
  const sticky = page.getByTestId('sticky-atc');
  await expect(sticky).toBeHidden();
  await page.locator('#how-it-works').scrollIntoViewIfNeeded();
  await expect(sticky).toBeVisible();
  await expect(sticky).toContainText('$36');
});

test('the sticky bar switches packs and stays in sync with the picker', async ({ page }) => {
  await page.goto('/en');
  await page.locator('#how-it-works').scrollIntoViewIfNeeded();
  const sticky = page.getByTestId('sticky-atc');
  await expect(sticky).toBeVisible();
  await sticky.getByTestId('sticky-pack').selectOption({ label: 'Single Room Protection · $20' });
  await expect(sticky.locator('p').filter({ hasText: '$20' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Single Room Protection/ })).toBeChecked();
  await expect(page.getByTestId('price-block')).toContainText('$20');
});

test('the gallery shows the chosen pack, not the other packs', async ({ page }) => {
  await page.goto('/en');
  // Seeded photos are all pack shots, so there is nothing else to page through.
  await expect(page.getByRole('button', { name: /Show image/ })).toHaveCount(0);
  await page.getByTestId('bundle-option').filter({ hasText: 'Family Pack' }).click();
  await expect(page.getByTestId('gallery').getByRole('img', { name: /pack of 3/ })).toBeVisible();
});

test('a mosquito lands on the comparison badge', async ({ page }) => {
  await page.goto('/en');
  await page.getByText('IBADA vs other pesticide solutions').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('mosquito')).toBeVisible();
});

test('page sections render', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('PEST FREE LIVING');
  await expect(page.locator('#how-it-works')).toContainText('Easy to use');
  await expect(page.getByText('Effective against 40+ common house pests')).toBeVisible();
  await expect(page.getByText('IBADA vs other pesticide solutions')).toBeVisible();
  await expect(page.getByText('Frequently asked questions')).toBeVisible();
});

test('arabic product page', async ({ page }) => {
  await page.goto('/ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('bundle-option').filter({ hasText: 'باقة العائلة' })).toBeVisible();
  await expect(page.getByTestId('price-block')).toContainText('$36');
});

test('product and shop pages', async ({ page }) => {
  await page.goto('/en/shop');
  await page.getByRole('link', { name: /IBADA ONE/ }).first().click();
  await expect(page).toHaveURL(/\/en\/products\/ibada-one$/);
  await expect(page.getByRole('radio')).toHaveCount(4);
  const res = await page.goto('/en/products/nope');
  expect(res?.status()).toBe(404);
});

test('seo files and structured data', async ({ page, request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/en/products/ibada-one');
  expect(sitemap).toContain('/ar/shop');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Disallow: \/admin/);
  await page.goto('/en');
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}');
  expect(ld.offers.lowPrice).toBe('20.00');
  await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveCount(1);
});
