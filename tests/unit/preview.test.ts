import { expect, test } from 'vitest';
import { signValue } from '@/server/crypto';
import { createPreviewToken, isValidPreviewToken, PREVIEW_TTL_SECONDS } from '@/server/preview';

const now = new Date('2026-10-01T10:00:00Z');

test('a fresh preview token is accepted', () => {
  expect(isValidPreviewToken(createPreviewToken(now), now)).toBe(true);
});

test('tampered, expired and unrelated signed values are refused', () => {
  const token = createPreviewToken(now);
  expect(isValidPreviewToken(`${token}x`, now)).toBe(false);
  const later = new Date(now.getTime() + (PREVIEW_TTL_SECONDS + 1) * 1000);
  expect(isValidPreviewToken(token, later)).toBe(false);
  // An order-confirmation cookie is signed with the same key but is not a preview token.
  expect(isValidPreviewToken(signValue('some-order-id', 3600, now), now)).toBe(false);
  expect(isValidPreviewToken('', now)).toBe(false);
});

test('preview links last a week', () => {
  expect(PREVIEW_TTL_SECONDS).toBe(7 * 24 * 3600);
});
