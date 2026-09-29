import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { getEnv, requireAuthSecret } from '@/env';

const secret = () => requireAuthSecret(getEnv());

/** Salted SHA-256 of an IP so raw addresses are never stored. */
export function hashIp(ip: string | null): string {
  if (!ip) return 'unknown';
  return createHash('sha256').update(`${secret()}:${ip}`).digest('hex');
}

/** Client IP as reported by the hosting proxy (first X-Forwarded-For hop). */
export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip')?.trim() || null;
}

const mac = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

/** `value.expiry.hmac`, valid for `ttlSeconds`. */
export function signValue(value: string, ttlSeconds: number, now: Date = new Date()): string {
  const exp = Math.floor(now.getTime() / 1000) + ttlSeconds;
  const payload = `${value}.${exp}`;
  return `${payload}.${mac(payload)}`;
}

/** The signed value, or null when tampered with or expired. */
export function verifySignedValue(token: string, now: Date = new Date()): string | null {
  const lastDot = token.lastIndexOf('.');
  if (lastDot <= 0) return null;
  const payload = token.slice(0, lastDot);
  const given = Buffer.from(token.slice(lastDot + 1));
  const expected = Buffer.from(mac(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  const expDot = payload.lastIndexOf('.');
  const exp = Number(payload.slice(expDot + 1));
  if (expDot <= 0 || !Number.isFinite(exp) || Math.floor(now.getTime() / 1000) > exp) return null;
  return payload.slice(0, expDot);
}
