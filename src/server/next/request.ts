import 'server-only';
import { cookies, headers } from 'next/headers';
import { getClientIp } from '../crypto';

export const SESSION_COOKIE = 'ibada_sid';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const isSessionId = (v: string | undefined | null): v is string => !!v && UUID.test(v);

/** Visitor IP as seen by the hosting proxy. */
export async function requestIp(): Promise<string | null> {
  return getClientIp(await headers());
}

/** Anonymous funnel session id from the first-party cookie, if present and well-formed. */
export async function requestSessionId(): Promise<string | null> {
  const v = (await cookies()).get(SESSION_COOKIE)?.value;
  return isSessionId(v) ? v : null;
}
