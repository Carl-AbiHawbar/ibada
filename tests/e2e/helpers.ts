import { existsSync, readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import * as OTPAuth from 'otpauth';

export const OWNER = { email: 'owner@ibada.test', password: 'e2e-owner-password-123' };
export const OWNER_STATE = '.data/e2e-owner.json';
export const OWNER_SECRET_FILE = '.data/e2e-owner-totp.txt';

export function totp(secret: string): string {
  return new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 }).generate();
}

export function ownerSecret(): string | null {
  return existsSync(OWNER_SECRET_FILE) ? readFileSync(OWNER_SECRET_FILE, 'utf8').trim() : null;
}

/** Wait until a fresh 30-second TOTP window so a code isn't reused (replay protection). */
export async function freshCode(secret: string, used = new Set<string>()): Promise<string> {
  for (;;) {
    const code = totp(secret);
    if (!used.has(code)) return code;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export async function signInWithPassword(page: Page, email: string, password: string) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function enterCode(page: Page, code: string) {
  await expect(page).toHaveURL(/\/admin\/two-factor$/);
  await page.getByLabel('Authenticator code').fill(code);
}

/** A random Lebanese mobile number, so runs sharing a database never collide. */
export function randomPhone(prefix = '71'): string {
  return `${prefix} ${String(Math.floor(100000 + Math.random() * 899999))}`;
}

/** Place a real Multi-Room order through the storefront; returns the order number. */
export async function placeStorefrontOrder(page: Page, name: string, phone: string): Promise<string> {
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
