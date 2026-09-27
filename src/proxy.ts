import { getSessionCookie } from 'better-auth/cookies';
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { buildCsp } from './server/security/csp';

const intl = createMiddleware(routing);

// Admin pages reachable without a session.
const PUBLIC_ADMIN = [/^\/admin\/login\/?$/, /^\/admin\/two-factor\/?$/, /^\/admin\/invite\/[^/]+\/?$/];
// Dynamic pages that get a strict per-request nonce CSP.
const NONCE_ROUTES = [/^\/admin(\/|$)/, /^\/(en|ar)\/(checkout|track|order)(\/|$)/];

const supabaseHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : null;
const upgradeInsecure = (process.env.SITE_URL ?? '').startsWith('https://');
const dev = process.env.NODE_ENV === 'development';

export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const nonce = NONCE_ROUTES.some((re) => re.test(path)) ? btoa(crypto.randomUUID()) : undefined;
  const csp = buildCsp({ nonce, dev, supabaseHost, upgradeInsecure });

  // Next.js reads the nonce from the request's CSP header and applies it to its own scripts.
  if (nonce) {
    request.headers.set('x-nonce', nonce);
    request.headers.set('content-security-policy', csp);
  }

  let response: NextResponse;
  if (path.startsWith('/admin')) {
    const isPublic = PUBLIC_ADMIN.some((re) => re.test(path));
    // Optimistic cookie check only; every admin page and action re-checks the session on the server.
    response =
      !isPublic && !getSessionCookie(request, { cookiePrefix: 'ibada' })
        ? NextResponse.redirect(new URL('/admin/login', request.url))
        : NextResponse.next({ request: { headers: request.headers } });
  } else {
    response = intl(request);
  }
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
