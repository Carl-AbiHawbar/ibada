import { draftMode } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

/** Leaves the private preview and returns to the shop. */
export async function GET(req: NextRequest) {
  (await draftMode()).disable();
  const locale = req.nextUrl.searchParams.get('locale') === 'ar' ? 'ar' : 'en';
  return NextResponse.redirect(new URL(`/${locale}`, req.url));
}
