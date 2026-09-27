import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertSafeKey, type Storage } from './types';

export const LOCAL_UPLOAD_PREFIX = '/uploads/';

/** Development/test storage: files under `root`, served by the /uploads route. */
export function createLocalStorage(root: string): Storage {
  const resolve = (key: string) => {
    assertSafeKey(key);
    const full = path.resolve(root, key);
    if (!full.startsWith(path.resolve(root) + path.sep)) throw new Error('path escapes storage root');
    return full;
  };
  return {
    async put(key, data) {
      const full = resolve(key);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, data);
      return { url: `${LOCAL_UPLOAD_PREFIX}${key}` };
    },
    async remove(url) {
      if (!url.startsWith(LOCAL_UPLOAD_PREFIX)) return;
      await rm(resolve(url.slice(LOCAL_UPLOAD_PREFIX.length)), { force: true });
    },
  };
}
