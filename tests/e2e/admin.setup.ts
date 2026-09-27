import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test as setup } from '@playwright/test';
import { OWNER, OWNER_SECRET_FILE, OWNER_STATE, enterCode, freshCode, ownerSecret, signInWithPassword } from './helpers';

// Signs the owner in once per run (enrolling the authenticator on a fresh database)
// and saves the session for the admin specs.
setup('owner signs in with two-step verification', async ({ page }) => {
  mkdirSync('.data', { recursive: true });
  await signInWithPassword(page, OWNER.email, OWNER.password);

  const saved = ownerSecret();
  const enrolled = await page
    .waitForURL(/\/admin\/(setup-2fa|two-factor)$/, { timeout: 15_000 })
    .then(() => page.url().endsWith('/two-factor'));

  if (enrolled && saved) {
    await enterCode(page, await freshCode(saved));
  } else {
    await expect(page).toHaveURL(/\/admin\/setup-2fa$/);
    await page.getByLabel('Password').fill(OWNER.password);
    await page.getByRole('button', { name: 'Continue' }).click();
    const secret = (await page.getByTestId('totp-secret').textContent())!.trim();
    writeFileSync(OWNER_SECRET_FILE, secret);
    await page.getByLabel(/Enter the 6-digit code/).fill(await freshCode(secret));
    await expect(page.getByTestId('backup-codes').locator('li')).toHaveCount(10);
    await page.getByRole('button', { name: 'I saved them' }).click();
  }

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible();
  await page.context().storageState({ path: OWNER_STATE });
});
