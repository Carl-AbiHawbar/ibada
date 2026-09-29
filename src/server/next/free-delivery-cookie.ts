import 'server-only';
import { cookies } from 'next/headers';
import { getEnv } from '@/env';
import { signValue, verifySignedValue } from '../crypto';

const COOKIE = 'ibada_free_delivery';
const TTL_SECONDS = 180 * 24 * 3600;

/** Remember that this browser claimed the free-delivery offer (value: the signup id). */
export async function setFreeDeliveryCookie(signupId: string): Promise<void> {
  (await cookies()).set(COOKIE, signValue(signupId, TTL_SECONDS), {
    httpOnly: true,
    sameSite: 'lax',
    secure: getEnv().SITE_URL.startsWith('https://'),
    path: '/',
    maxAge: TTL_SECONDS,
  });
}

/** True when this browser holds a valid, unexpired free-delivery cookie. */
export async function hasFreeDelivery(): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE)?.value;
  return raw ? verifySignedValue(raw) !== null : false;
}
