import { createClient } from '@supabase/supabase-js';
import { assertSafeKey, type Storage } from './types';

/** Production storage: a public Supabase Storage bucket, written only from the server. */
export function createSupabaseStorage(opts: { url: string; serviceRoleKey: string; bucket: string }): Storage {
  const client = createClient(opts.url, opts.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const bucket = client.storage.from(opts.bucket);
  const marker = `/storage/v1/object/public/${opts.bucket}/`;
  return {
    async put(key, data, contentType) {
      assertSafeKey(key);
      const { error } = await bucket.upload(key, data, { contentType, upsert: false, cacheControl: '31536000' });
      if (error) throw error;
      return { url: bucket.getPublicUrl(key).data.publicUrl };
    },
    async remove(url) {
      const i = url.indexOf(marker);
      if (i < 0) return;
      const key = decodeURIComponent(url.slice(i + marker.length));
      assertSafeKey(key);
      await bucket.remove([key]);
    },
  };
}
