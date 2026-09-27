import 'server-only';
import { cookies } from 'next/headers';
import { getEnv } from '@/env';
import { signValue, verifySignedValue } from '../crypto';

const COOKIE = 'ibada_order';
const TTL_SECONDS = 3600;

/** Remember which order this browser just placed, so only it can see the confirmation page. */
export async function setOrderCookie(orderId: string): Promise<void> {
  (await cookies()).set(COOKIE, signValue(orderId, TTL_SECONDS), {
    httpOnly: true,
    sameSite: 'lax',
    secure: getEnv().SITE_URL.startsWith('https://'),
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

export async function readOrderCookie(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  return raw ? verifySignedValue(raw) : null;
}
