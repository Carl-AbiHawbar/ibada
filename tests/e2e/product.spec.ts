import { expect, test } from '@playwright/test';

test('bundle picker drives the price', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('radio')).toHaveCount(4);
  await expect(page.getByRole('radio', { name: /Multi-Room Protection/ })).toBeChecked();

  const price = page.getByTestId('price-block');
  await expect(price).toContainText('$35.99');
  await expect(price).toContainText('$60');
  await expect(price).toContainText('Save 40%');

  await page.getByTestId('bundle-option').filter({ hasText: 'Family Pack' }).click();
  await expect(page.getByRole('radio', { name: /Family Pack/ })).toBeChecked();
  await expect(price).toContainText('$50.99');
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
  await expect(sticky).toContainText('$35.99');
});

test('the sticky bar switches packs and stays in sync with the picker', async ({ page }) => {
  await page.goto('/en');
  await page.locator('#how-it-works').scrollIntoViewIfNeeded();
  const sticky = page.getByTestId('sticky-atc');
  await expect(sticky).toBeVisible();
  await sticky.getByTestId('sticky-pack').selectOption({ label: 'Single Room Protection · 50m²' });
  await expect(sticky.locator('p').filter({ hasText: '$19.99' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Single Room Protection/ })).toBeChecked();
  await expect(page.getByTestId('price-block')).toContainText('$19.99');
});

test('the gallery shows the chosen pack, then the lifestyle photos', async ({ page }) => {
  await page.goto('/en');
  // The selected pack's photo plus 5 lifestyle photos; the other packs only appear in the picker.
  await expect(page.getByTestId('gallery').getByRole('button', { name: /Show image/ })).toHaveCount(6);
  await expect(page.getByTestId('gallery').getByRole('img', { name: /no scent, no insects/ })).toHaveCount(1);
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
  await expect(page.getByTestId('price-block')).toContainText('$35.99');
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

test('hero follows the refinement deck', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByText('One device. A calmer home.')).toHaveCount(0);
  await expect(page.getByText('ULTRASONIC PEST REPELLER', { exact: false })).toHaveCount(0);
  const benefits = page.getByTestId('benefits').locator('ul');
  await expect(benefits.nth(0)).toContainText('24/7 continuous protection');
  await expect(benefits.nth(1)).toContainText('Plug in & forget');
});

test('arabic gallery, steps and comparison use the client images', async ({ page }) => {
  await page.goto('/ar');
  const gallery = page.getByTestId('gallery');
  await expect(gallery.locator('img[src*="gallery-box-ar"]').first()).toBeAttached();
  await page.goto('/en');
  await expect(page.locator('img[src*="step1-plug-in"]').first()).toBeAttached();
  await expect(page.locator('img[src*="step2-relax"]').first()).toBeAttached();
  await expect(page.getByTestId('comparison-others').locator('img')).toBeAttached();
});
