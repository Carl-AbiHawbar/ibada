import { expect, test } from '@playwright/test';
import { OWNER_STATE, freshCode, signInWithPassword } from './helpers';

test.use({ storageState: OWNER_STATE });

test('owner invites staff who can work on orders but not settings', async ({ page, browser }) => {
  const email = `staff-${Date.now() % 1_000_000}-${Math.floor(Math.random() * 1000)}@ibada.test`;
  const password = 'staff-password-123';

  await page.goto('/admin/staff');
  await page.getByRole('button', { name: 'Invite' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Create invite link' }).click();
  const link = (await page.getByTestId('invite-link').textContent())!.trim();
  expect(link).toMatch(/\/admin\/invite\/[\w-]+$/);

  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const staff = await ctx.newPage();
  await staff.goto(link);
  await staff.getByLabel('Your name').fill('Sara Staff');
  await staff.getByLabel('Password', { exact: true }).fill(password);
  await staff.getByLabel('Repeat password').fill(password);
  await staff.getByRole('button', { name: 'Create account' }).click();
  await expect(staff).toHaveURL(/\/admin\/login\?invited=1$/);

  await signInWithPassword(staff, email, password);
  await expect(staff).toHaveURL(/\/admin\/setup-2fa$/);
  await staff.getByLabel('Password').fill(password);
  await staff.getByRole('button', { name: 'Continue' }).click();
  const secret = (await staff.getByTestId('totp-secret').textContent())!.trim();
  await staff.getByLabel(/Enter the 6-digit code/).fill(await freshCode(secret));
  await staff.getByRole('button', { name: 'I saved them' }).click();
  await expect(staff).toHaveURL(/\/admin$/);

  await expect(staff.getByRole('link', { name: 'Settings' })).toHaveCount(0);
  await staff.goto('/admin/orders');
  await expect(staff.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible();
  await staff.goto('/admin/settings');
  await expect(staff).toHaveURL(/\/admin\/forbidden$/);
  await expect(staff.getByText("You don't have access to this page.")).toBeVisible();

  // Deactivating signs them out immediately.
  await page.goto('/admin/staff');
  await page.getByTestId('staff-row').filter({ hasText: email }).getByRole('switch', { name: 'Active' }).uncheck();
  await expect(page.getByText('Access updated')).toBeVisible();
  await staff.goto('/admin/orders');
  await expect(staff).toHaveURL(/\/admin\/login$/);
  await ctx.close();
});

test('announcement changes appear on the shop', async ({ page }) => {
  const text = `Free delivery all over Lebanon ${Date.now() % 10000}`;
  await page.goto('/admin/settings');
  const original = await page.getByLabel('Announcement (English)').inputValue();
  await page.getByLabel('Announcement (English)').fill(text);
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Settings saved')).toBeVisible();

  await page.goto('/en');
  await expect(page.getByTestId('announcement')).toHaveText(text);
  // Every pre-rendered page that shows the announcement is regenerated, not turned into a 404.
  for (const path of ['/en/policies/returns', '/en/contact', '/en/products/ibada-one']) {
    expect((await page.goto(path))?.status(), path).toBe(200);
    await expect(page.getByTestId('announcement')).toHaveText(text);
  }

  await page.goto('/admin/settings');
  await page.getByLabel('Announcement (English)').fill(original);
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Settings saved')).toBeVisible();
});

test('activity log records admin changes', async ({ page }) => {
  await page.goto('/admin/activity');
  await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible();
  await expect(page.getByTestId('audit-row').first()).toBeVisible();
});
