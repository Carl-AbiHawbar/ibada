type SharpFn = typeof import('sharp').default;

// Loaded at runtime instead of bundled: Turbopack links external packages into the build
// folder, which fails on exFAT drives (no link support). next.config traces it for Vercel.
let sharpPromise: Promise<SharpFn> | undefined;
const loadSharp = () =>
  (sharpPromise ??= import(/* turbopackIgnore: true */ /* webpackIgnore: true */ 'sharp').then((m) => m.default));

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['jpeg', 'png', 'webp', 'avif', 'heif']);

export type ProcessedImage =
  | { ok: true; data: Buffer; width: number; height: number }
  | { ok: false; error: 'too_large' | 'not_image' | 'unsupported' };

/**
 * Decode an uploaded photo and re-encode it as WebP (≤ 2400 px wide), dropping
 * EXIF/GPS metadata. Anything that isn't a real JPEG/PNG/WebP/AVIF is refused.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) return { ok: false, error: 'too_large' };
  const sharp = await loadSharp();
  let format: string | undefined;
  try {
    format = (await sharp(input, { limitInputPixels: 50_000_000 }).metadata()).format;
  } catch {
    return { ok: false, error: 'not_image' };
  }
  if (!format || !ALLOWED.has(format)) return { ok: false, error: 'unsupported' };
  try {
    const { data, info } = await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: 2400, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { ok: true, data, width: info.width, height: info.height };
  } catch {
    return { ok: false, error: 'not_image' };
  }
}
