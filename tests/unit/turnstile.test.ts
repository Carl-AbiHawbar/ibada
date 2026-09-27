import { expect, test, vi } from 'vitest';
import { createTurnstileVerifier } from '@/server/turnstile';

const ok = (body: object) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

test('passes a token Cloudflare accepts, sending secret, token and IP', async () => {
  const f = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => ok({ success: true }));
  expect(await createTurnstileVerifier('s3cret', f as typeof fetch)('tok', '1.2.3.4')).toBe(true);
  const [url, init] = f.mock.calls[0]!;
  expect(String(url)).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
  const body = init?.body as URLSearchParams;
  expect(body.get('secret')).toBe('s3cret');
  expect(body.get('response')).toBe('tok');
  expect(body.get('remoteip')).toBe('1.2.3.4');
});

test('fails a token Cloudflare rejects', async () => {
  const f = vi.fn(async () => ok({ success: false, 'error-codes': ['invalid-input-response'] }));
  expect(await createTurnstileVerifier('s', f as unknown as typeof fetch)('tok', null)).toBe(false);
});

test('empty token fails without calling Cloudflare', async () => {
  const f = vi.fn();
  expect(await createTurnstileVerifier('s', f as unknown as typeof fetch)('', null)).toBe(false);
  expect(f).not.toHaveBeenCalled();
});

test('network errors fail closed', async () => {
  const f = vi.fn().mockRejectedValue(new Error('net'));
  expect(await createTurnstileVerifier('s', f as unknown as typeof fetch)('tok', null)).toBe(false);
});
