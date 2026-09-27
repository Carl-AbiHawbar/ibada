const TURNSTILE = 'https://challenges.cloudflare.com';

/**
 * Content-Security-Policy for a response.
 * - With a nonce (dynamic pages: admin, checkout, tracking): only nonce'd scripts run.
 * - Without (pre-rendered storefront pages): inline scripts allowed because nonces
 *   would force dynamic rendering; these pages never render user-supplied HTML.
 * Inline styles are allowed everywhere (charts, toasts, progress bars use style attributes).
 */
export function buildCsp(a: { nonce?: string; dev: boolean; supabaseHost?: string | null; upgradeInsecure?: boolean }): string {
  const script = a.nonce
    ? [`'self'`, `'nonce-${a.nonce}'`, `'strict-dynamic'`, TURNSTILE]
    : [`'self'`, `'unsafe-inline'`, TURNSTILE];
  if (a.dev) script.push(`'unsafe-eval'`);
  const images = [`'self'`, 'data:', 'blob:', ...(a.supabaseHost ? [`https://${a.supabaseHost}`] : [])];

  const directives = [
    `default-src 'self'`,
    `script-src ${script.join(' ')}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${images.join(' ')}`,
    `font-src 'self'`,
    `connect-src 'self' ${TURNSTILE}${a.dev ? ' ws:' : ''}`,
    `frame-src ${TURNSTILE}`,
    `worker-src 'self'`,
    `manifest-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];
  if (a.upgradeInsecure) directives.push('upgrade-insecure-requests');
  return directives.join('; ');
}
