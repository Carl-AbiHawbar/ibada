import { signValue, verifySignedValue } from './crypto';

const PREVIEW_VALUE = 'storefront-preview';
export const PREVIEW_TTL_SECONDS = 7 * 24 * 3600;

/** Signed token for a shareable preview link (sample reviews visible only to its holder). */
export function createPreviewToken(now: Date = new Date()): string {
  return signValue(PREVIEW_VALUE, PREVIEW_TTL_SECONDS, now);
}

export function isValidPreviewToken(token: string, now: Date = new Date()): boolean {
  return token !== '' && verifySignedValue(token, now) === PREVIEW_VALUE;
}
