import { expect, test } from 'vitest';
import { getClientIp, hashIp, signValue, verifySignedValue } from '@/server/crypto';

const now = new Date('2026-09-27T10:00:00Z');

test('signed values round-trip until they expire', () => {
  const tok = signValue('order-1', 60, now);
  expect(verifySignedValue(tok, now)).toBe('order-1');
  expect(verifySignedValue(tok, new Date(now.getTime() + 60_000))).toBe('order-1');
  expect(verifySignedValue(tok, new Date(now.getTime() + 61_000))).toBeNull();
});

test('tampering is detected', () => {
  const tok = signValue('order-1', 60, now);
  const flipped = tok.slice(0, -1) + (tok.endsWith('A') ? 'B' : 'A');
  expect(verifySignedValue(flipped, now)).toBeNull();
  expect(verifySignedValue(tok.replace('order-1', 'order-2'), now)).toBeNull();
  expect(verifySignedValue('garbage', now)).toBeNull();
  expect(verifySignedValue('', now)).toBeNull();
});

test('values containing dots survive', () => {
  expect(verifySignedValue(signValue('a.b.c', 60, now), now)).toBe('a.b.c');
});

test('IP hashes are stable, distinct and not the raw IP', () => {
  expect(hashIp('1.2.3.4')).toMatch(/^[0-9a-f]{64}$/);
  expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
  expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'));
  expect(hashIp(null)).toBe('unknown');
});

test('client IP comes from the first forwarded hop', () => {
  expect(getClientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
  expect(getClientIp(new Headers({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
  expect(getClientIp(new Headers())).toBeNull();
});
