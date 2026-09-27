import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterAll, expect, test } from 'vitest';
import { processImage } from '@/server/images';
import { createLocalStorage } from '@/server/storage/local';

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#0693e6' } }).png().toBuffer();

test('large photos are resized to 2400px wide WebP', async () => {
  const r = await processImage(await png(4000, 1000));
  expect(r).toMatchObject({ ok: true, width: 2400, height: 600 });
  if (r.ok) expect((await sharp(r.data).metadata()).format).toBe('webp');
});

test('small photos are not enlarged', async () => {
  expect(await processImage(await png(800, 600))).toMatchObject({ ok: true, width: 800, height: 600 });
});

test('metadata such as GPS location is stripped', async () => {
  const withExif = await sharp(await png(50, 50))
    .withExif({ IFD0: { Copyright: 'secret-owner' } })
    .jpeg()
    .toBuffer();
  const r = await processImage(withExif);
  expect(r.ok).toBe(true);
  if (r.ok) expect((await sharp(r.data).metadata()).exif).toBeUndefined();
});

test('rejects non-images, unsupported formats and huge files', async () => {
  expect(await processImage(Buffer.from('hello'))).toEqual({ ok: false, error: 'not_image' });
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
  expect(await processImage(svg)).toEqual({ ok: false, error: 'unsupported' });
  expect(await processImage(Buffer.alloc(5 * 1024 * 1024 + 1))).toEqual({ ok: false, error: 'too_large' });
});

const dirs: string[] = [];
afterAll(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })));
});

test('local storage writes under its root and refuses path tricks', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ibada-uploads-'));
  dirs.push(dir);
  const store = createLocalStorage(dir);
  const { url } = await store.put('products/a.webp', Buffer.from('x'), 'image/webp');
  expect(url).toBe('/uploads/products/a.webp');
  expect(await readFile(path.join(dir, 'products/a.webp'), 'utf8')).toBe('x');
  await expect(store.put('../escape.webp', Buffer.from('x'), 'image/webp')).rejects.toThrow();
  await store.remove(url);
  await expect(readFile(path.join(dir, 'products/a.webp'))).rejects.toThrow();
});
