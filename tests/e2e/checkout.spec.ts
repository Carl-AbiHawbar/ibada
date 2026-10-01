import { expect, test, type Page } from '@playwright/test';

async function addDefaultBundle(page: Page, locale: 'en' | 'ar' = 'en') {
  await page.goto(`/${locale}`);
  await page.getByRole('button', { name: locale === 'en' ? 'ADD TO CART' : 'أضف إلى السلة' }).first().click();
  await page.getByRole('dialog').getByRole('link', { name: locale === 'en' ? 'Checkout' : 'إتمام الطلب' }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/checkout$`));
}

async function fillAddress(page: Page, labels: Record<string, string>, phone = '03 123 456') {
  await page.getByLabel(labels.name!).fill('E2E Buyer');
  await page.getByLabel(labels.phone!).fill(phone);
  await page.getByLabel(labels.governorate!).selectOption('mount-lebanon');
  await page.getByLabel(labels.district!).selectOption('metn');
  await page.getByLabel(labels.town!).fill('Jdeideh');
  await page.getByLabel(labels.address!).fill('Main st, Bldg 5, 2nd floor');
}

const EN = {
  name: 'Full name',
  phone: 'Phone',
  governorate: 'Governorate',
  district: 'District',
  town: 'Town / city',
  address: 'Address details',
};
const AR = {
  name: 'الاسم الكامل',
  phone: 'رقم الهاتف',
  governorate: 'المحافظة',
  district: 'القضاء',
  town: 'البلدة / المدينة',
  address: 'تفاصيل العنوان',
};

test.describe.serial('checkout', () => {
  let orderNumber = '';

  test('english purchase', async ({ page }) => {
    await addDefaultBundle(page);
    await fillAddress(page, EN);
    await expect(page.getByTestId('summary-delivery')).toHaveText('FREE');
    await expect(page.getByTestId('summary-total')).toHaveText('$35.99');
    await expect(page.getByTestId('summary-payment')).toContainText('Cash on delivery');
    await page.getByRole('button', { name: 'PLACE ORDER' }).click();

    await expect(page).toHaveURL(/\/en\/order\/10\d\d$/, { timeout: 20_000 });
    orderNumber = page.url().split('/').pop()!;
    await expect(page.getByText(`#${orderNumber}`)).toBeVisible();
    await expect(page.getByText(/call you to confirm/i)).toBeVisible();
    // The cart is emptied once the order is placed.
    await expect(page.getByTestId('cart-count')).toHaveCount(0);
  });

  test('confirmation page is private', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/en/order/${orderNumber}`);
    await expect(page).toHaveURL(/\/en\/track$/);
    await ctx.close();
  });

  test('track order by number and phone', async ({ page }) => {
    await page.goto('/en/track');
    await page.getByLabel('Order number').fill(orderNumber);
    await page.getByLabel('Phone').fill('03123456');
    await page.getByRole('button', { name: 'Track order' }).click();
    await expect(page.getByTestId('track-result')).toContainText('Order received');
    await expect(page.getByTestId('track-result')).toContainText('Multi-Room Protection');
  });

  test('wrong phone does not reveal the order', async ({ page }) => {
    await page.goto('/en/track');
    await page.getByLabel('Order number').fill(orderNumber);
    await page.getByLabel('Phone').fill('70 000 000');
    await page.getByRole('button', { name: 'Track order' }).click();
    await expect(page.getByText(/couldn.t find an order/i)).toBeVisible();
  });
});

test('arabic purchase is rtl end to end', async ({ page }) => {
  await addDefaultBundle(page, 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await fillAddress(page, AR, '71 111 222');
  await page.getByRole('button', { name: 'تأكيد الطلب' }).click();
  await expect(page).toHaveURL(/\/ar\/order\/10\d\d$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('شكرًا');
});

test('discount code', async ({ page }) => {
  await addDefaultBundle(page);
  await page.getByLabel('Discount code').fill('welcome10');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByTestId('summary-discount')).toHaveText('-$3.60');
  await expect(page.getByTestId('summary-total')).toHaveText('$32.39');
  await page.getByLabel('Discount code').fill('NOPE');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText("This code isn't valid")).toBeVisible();
});

test('invalid phone shows a field error', async ({ page }) => {
  await addDefaultBundle(page);
  await fillAddress(page, EN, '01 123 456');
  await page.getByRole('button', { name: 'PLACE ORDER' }).click();
  await expect(page.getByText('Enter a valid Lebanese mobile number')).toBeVisible();
  await expect(page).toHaveURL(/\/en\/checkout$/);
});

test('empty cart checkout points back to the shop', async ({ page }) => {
  await page.goto('/en/checkout');
  await expect(page.getByText('Your cart is empty')).toBeVisible();
});

test('policies and contact render in both languages', async ({ page }) => {
  for (const slug of ['shipping', 'returns', 'privacy', 'terms']) {
    const res = await page.goto(`/en/policies/${slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await page.goto('/ar/policies/returns');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('60');
  await page.goto('/en/contact');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Contact');
  expect((await page.goto('/en/policies/nope'))?.status()).toBe(404);
});
