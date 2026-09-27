// Turns the owner's brand PNGs (assets/source) into web-ready files under public/ and src/app/.
// Run with `npm run assets` whenever a source image changes; outputs are committed.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { LOGO_MARK_PATHS as M } from '../src/components/brand/logo';

const root = path.resolve(__dirname, '..');
const src = (name: string) => path.join(root, 'assets/source', name);
const out = (rel: string) => path.join(root, rel);

async function productImages() {
  await mkdir(out('public/images/products'), { recursive: true });
  for (const size of ['single', 'double', 'triple', 'full']) {
    await sharp(src(`one-${size}.png`))
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(out(`public/images/products/ibada-one-${size}.webp`));
  }
}

/** Square SVG with the roof mark scaled to `markScale` of the canvas. */
function markSvg(opts: { size: number; markScale: number; background: string | null; roof: string; radius?: number }) {
  const { size, markScale, background, roof, radius = 0 } = opts;
  const w = size * markScale;
  const h = (w * 81) / 100;
  const x = (size - w) / 2;
  const y = (size - h) / 2 + h * 0.04;
  const s = w / 100;
  const bg = background ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/>` : '';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg}` +
      `<g transform="translate(${x} ${y}) scale(${s})"><path d="${M.roof}" fill="${roof}"/>` +
      `<circle cx="${M.dot.cx}" cy="${M.dot.cy}" r="${M.dot.r}" fill="${M.blue}"/></g></svg>`,
  );
}

async function icons() {
  await mkdir(out('public/admin/icons'), { recursive: true });
  // Browser tab icon: navy mark on transparent.
  await sharp(markSvg({ size: 512, markScale: 0.86, background: null, roof: M.navy })).png().toFile(out('src/app/icon.png'));
  // iOS home screen (storefront): navy mark on white.
  await sharp(markSvg({ size: 180, markScale: 0.62, background: '#FFFFFF', roof: M.navy })).png().toFile(out('src/app/apple-icon.png'));
  // Admin app icons: white mark on navy.
  for (const size of [192, 512]) {
    await sharp(markSvg({ size, markScale: 0.6, background: M.navy, roof: '#FFFFFF' }))
      .png()
      .toFile(out(`public/admin/icons/icon-${size}.png`));
  }
  // Maskable: full-bleed background, mark inside the 60% safe zone.
  await sharp(markSvg({ size: 512, markScale: 0.5, background: M.navy, roof: '#FFFFFF' }))
    .png()
    .toFile(out('public/admin/icons/maskable-512.png'));
  await sharp(markSvg({ size: 180, markScale: 0.6, background: M.navy, roof: '#FFFFFF' }))
    .png()
    .toFile(out('public/admin/icons/apple-touch-icon.png'));
}

async function main() {
  await productImages();
  await icons();
  console.log('Assets written.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
