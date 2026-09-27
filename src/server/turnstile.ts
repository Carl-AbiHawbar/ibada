import { getEnv } from '@/env';

export type TurnstileVerifier = (token: string, ip: string | null) => Promise<boolean>;

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Server-side check of a Cloudflare Turnstile token. Fails closed on any error. */
export function createTurnstileVerifier(secret: string, fetchImpl: typeof fetch = fetch): TurnstileVerifier {
  return async (token, ip) => {
    if (!token) return false;
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set('remoteip', ip);
    try {
      const res = await fetchImpl(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(8000) });
      const data = (await res.json()) as { success?: boolean };
      return data.success === true;
    } catch {
      return false;
    }
  };
}

export const verifyTurnstile: TurnstileVerifier = (token, ip) =>
  createTurnstileVerifier(getEnv().TURNSTILE_SECRET_KEY)(token, ip);
