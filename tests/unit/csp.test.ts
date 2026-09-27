import { expect, test } from 'vitest';
import { buildCsp } from '@/server/security/csp';

const directive = (csp: string, name: string) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? '';

test('static storefront policy', () => {
  const s = buildCsp({ dev: false, supabaseHost: 'p.supabase.co', upgradeInsecure: true });
  expect(directive(s, 'script-src')).toBe("script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com");
  expect(s).toContain("frame-ancestors 'none'");
  expect(s).toContain("object-src 'none'");
  expect(s).toContain("base-uri 'self'");
  expect(s).toContain("form-action 'self'");
  expect(directive(s, 'img-src')).toContain('https://p.supabase.co');
  expect(directive(s, 'frame-src')).toBe('frame-src https://challenges.cloudflare.com');
  expect(s).toContain('upgrade-insecure-requests');
  expect(s).not.toContain("'unsafe-eval'");
});

test('nonce policy drops unsafe-inline for scripts but keeps inline styles', () => {
  const n = buildCsp({ nonce: 'abc', dev: false });
  expect(directive(n, 'script-src')).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic' https://challenges.cloudflare.com");
  expect(directive(n, 'style-src')).toBe("style-src 'self' 'unsafe-inline'");
});

test('development allows eval for React debugging; http origins are not upgraded', () => {
  const d = buildCsp({ dev: true });
  expect(directive(d, 'script-src')).toContain("'unsafe-eval'");
  expect(d).not.toContain('upgrade-insecure-requests');
});
