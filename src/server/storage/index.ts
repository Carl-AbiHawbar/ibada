import path from 'node:path';
import { getEnv } from '@/env';
import { createLocalStorage } from './local';
import { createSupabaseStorage } from './supabase';
import type { Storage } from './types';

export type { Storage } from './types';
export const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), '.data/uploads');

let cached: Storage | undefined;

export function getStorage(): Storage {
  if (cached) return cached;
  const env = getEnv();
  cached =
    env.STORAGE_DRIVER === 'supabase'
      ? createSupabaseStorage({ url: env.SUPABASE_URL!, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY!, bucket: env.SUPABASE_STORAGE_BUCKET })
      : createLocalStorage(LOCAL_UPLOAD_DIR);
  return cached;
}
