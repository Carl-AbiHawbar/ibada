import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getEnv } from '@/env';
import { recordEvent } from '@/server/analytics';
import { getClientIp, hashIp } from '@/server/crypto';
import { getDb } from '@/server/db/client';
import { SESSION_COOKIE, isSessionId } from '@/server/next/request';
import { hitLimit } from '@/server/rate-limit';

const bodySchema = z.object({
  type: z.enum(['view_product', 'add_to_cart', 'begin_checkout']),
  locale: z.enum(['en', 'ar']),
});

/** Anonymous funnel step from the storefront (order_placed is recorded server-side only). */
export async function POST(req: NextRequest) {
  if (Number(req.headers.get('content-length') ?? 0) > 1024) return new NextResponse(null, { status: 413 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const db = getDb();
  const limit = await hitLimit(db, `events:ip:${hashIp(getClientIp(req.headers))}`, 300, 3600);
  if (!limit.allowed) return new NextResponse(null, { status: 429 });

  const existing = req.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = isSessionId(existing) ? existing : crypto.randomUUID();
  await recordEvent(db, { type: parsed.data.type, sessionId, locale: parsed.data.locale });

  const res = new NextResponse(null, { status: 204 });
  if (sessionId !== existing) {
    res.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: getEnv().SITE_URL.startsWith('https://'),
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
