import { draftMode } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { isValidPreviewToken } from '@/server/preview';

/** Opens the private preview (sample reviews) for this browser when the link's token is valid. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const locale = req.nextUrl.searchParams.get('locale') === 'ar' ? 'ar' : 'en';
  if (isValidPreviewToken(token)) (await draftMode()).enable();
  return NextResponse.redirect(new URL(`/${locale}`, req.url));
}
