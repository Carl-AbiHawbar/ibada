import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getEnv } from '@/env';
import { LOCAL_UPLOAD_DIR } from '@/server/storage';

// Serves locally stored uploads (development/test only; production uses Supabase Storage URLs).
export async function GET(_req: Request, { params }: RouteContext<'/uploads/[...key]'>) {
  if (getEnv().STORAGE_DRIVER !== 'local') return new Response(null, { status: 404 });
  const key = (await params).key.join('/');
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*\.webp$/.test(key)) return new Response(null, { status: 404 });
  const full = path.resolve(LOCAL_UPLOAD_DIR, key);
  if (!full.startsWith(LOCAL_UPLOAD_DIR + path.sep)) return new Response(null, { status: 404 });
  try {
    const data = await readFile(full);
    return new Response(new Uint8Array(data), {
      headers: {
        'content-type': 'image/webp',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
