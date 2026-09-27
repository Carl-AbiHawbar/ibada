import { getSessionCookie } from 'better-auth/cookies';
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

// Admin pages reachable without a session.
const PUBLIC_ADMIN = [/^\/admin\/login\/?$/, /^\/admin\/two-factor\/?$/, /^\/admin\/invite\/[^/]+\/?$/];

function adminGate(request: NextRequest): NextResponse {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_ADMIN.some((re) => re.test(path));
  // Optimistic cookie check only; every admin page and action re-checks the session on the server.
  if (!isPublic && !getSessionCookie(request, { cookiePrefix: 'ibada' })) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return NextResponse.next();
}

export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) return adminGate(request);
  return intl(request);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
