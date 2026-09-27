// Turns the owner's brand PNGs (assets/source) into web-ready files under public/ and src/app/.
// Run with `npm run assets` whenever a source image changes; outputs are committed.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

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

async function main() {
  await productImages();
  console.log('Assets written.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
