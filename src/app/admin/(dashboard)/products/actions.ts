'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  addImage,
  adjustStock,
  deleteImage,
  reorderBundles,
  reorderImages,
  saveBundle,
  saveProduct,
  setDefaultBundle,
  updateImageAlt,
} from '@/server/admin/products';
import { audit } from '@/server/audit';
import { getDb } from '@/server/db/client';
import { processImage } from '@/server/images';
import { requireAdmin } from '@/server/next/admin-session';
import { invalidate, TAGS } from '@/server/next/cache';
import { requestIp } from '@/server/next/request';
import { getStorage } from '@/server/storage';

type Result = { ok: true; id?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const uuid = z.uuid();
const toCents = (v: unknown) => (v === '' || v === null || v === undefined ? null : Math.round(Number(v) * 100));

async function done(entity: string, entityId: string, summary: string, userId: string) {
  await audit(getDb(), { userId, action: `${entity}.updated`, entity, entityId, summary, ip: await requestIp() });
  invalidate(TAGS.catalog);
  revalidatePath('/admin/products', 'layout');
  revalidatePath('/admin/inventory');
}

export async function saveProductAction(id: string | null, input: Record<string, unknown>): Promise<Result> {
  const { user } = await requireAdmin('products');
  if (id && !uuid.safeParse(id).success) return { ok: false, error: 'invalid' };
  const r = await saveProduct(getDb(), { id: id ?? undefined, input, userId: user.id });
  if (!r.ok) return r;
  await done('product', r.id, `${id ? 'Updated' : 'Created'} product ${String(input.nameEn ?? '')}`, user.id);
  if (!id) redirect(`/admin/products/${r.id}`);
  return { ok: true, id: r.id };
}

/** Bundle form sends dollars; the domain stores cents. */
export async function saveBundleAction(productId: string, id: string | null, input: Record<string, unknown>): Promise<Result> {
  const { user } = await requireAdmin('products');
  if (!uuid.safeParse(productId).success || (id && !uuid.safeParse(id).success)) return { ok: false, error: 'invalid' };
  const r = await saveBundle(getDb(), {
    productId,
    id: id ?? undefined,
    input: { ...input, priceCents: toCents(input.price), compareAtCents: toCents(input.compareAt), imageId: input.imageId || null },
  });
  if (!r.ok) {
    const fe = r.fieldErrors ?? {};
    return {
      ...r,
      fieldErrors: Object.fromEntries(
        Object.entries(fe).map(([k, v]) => [k === 'priceCents' ? 'price' : k === 'compareAtCents' ? 'compareAt' : k, v]),
      ),
    };
  }
  await done('bundle', r.id, `${id ? 'Updated' : 'Added'} bundle ${String(input.nameEn ?? '')}`, user.id);
  return { ok: true, id: r.id };
}

export async function setDefaultBundleAction(productId: string, bundleId: string) {
  const { user } = await requireAdmin('products');
  if (!uuid.safeParse(productId).success || !uuid.safeParse(bundleId).success) return;
  await setDefaultBundle(getDb(), productId, bundleId);
  await done('bundle', bundleId, 'Changed the default bundle', user.id);
}

export async function reorderAction(kind: 'bundles' | 'images', productId: string, ids: string[]) {
  const { user } = await requireAdmin('products');
  const parsed = z.array(uuid).max(50).safeParse(ids);
  if (!uuid.safeParse(productId).success || !parsed.success) return;
  await (kind === 'bundles' ? reorderBundles : reorderImages)(getDb(), productId, parsed.data);
  await done('product', productId, `Reordered ${kind}`, user.id);
}

export async function uploadImagesAction(productId: string, form: FormData): Promise<{ added: number; errors: string[] }> {
  const { user } = await requireAdmin('products');
  if (!uuid.safeParse(productId).success) return { added: 0, errors: ['invalid'] };
  const files = form.getAll('files').filter((f): f is File => f instanceof File).slice(0, 10);
  const errors: string[] = [];
  let added = 0;
  for (const file of files) {
    const r = await processImage(Buffer.from(await file.arrayBuffer()));
    if (!r.ok) {
      errors.push(`${file.name}: ${r.error === 'too_large' ? 'larger than 5 MB' : 'not a JPEG, PNG, WebP or AVIF photo'}`);
      continue;
    }
    const { url } = await getStorage().put(`products/${crypto.randomUUID()}.webp`, r.data, 'image/webp');
    await addImage(getDb(), { productId, url, width: r.width, height: r.height });
    added += 1;
  }
  if (added) await done('product', productId, `Uploaded ${added} photo(s)`, user.id);
  return { added, errors };
}

export async function updateImageAltAction(imageId: string, altEn: string, altAr: string) {
  const { user } = await requireAdmin('products');
  if (!uuid.safeParse(imageId).success) return;
  await updateImageAlt(getDb(), { imageId, altEn: String(altEn), altAr: String(altAr) });
  await done('image', imageId, 'Edited photo description', user.id);
}

export async function deleteImageAction(imageId: string) {
  const { user } = await requireAdmin('products');
  if (!uuid.safeParse(imageId).success) return;
  const r = await deleteImage(getDb(), imageId);
  if (r) await getStorage().remove(r.url).catch(() => {});
  await done('image', imageId, 'Deleted a photo', user.id);
}

export async function adjustStockAction(productId: string, delta: number, note: string): Promise<Result> {
  const { user } = await requireAdmin('inventory');
  if (!uuid.safeParse(productId).success) return { ok: false, error: 'invalid' };
  const r = await adjustStock(getDb(), { productId, delta: Math.trunc(Number(delta)), note: String(note), userId: user.id });
  if (!r.ok) return r;
  await audit(getDb(), {
    userId: user.id,
    action: 'inventory.adjusted',
    entity: 'product',
    entityId: productId,
    summary: `Stock ${delta > 0 ? '+' : ''}${delta} → ${r.stockUnits} (${note.trim()})`,
    ip: await requestIp(),
  });
  if (r.stockCrossedZero) invalidate(TAGS.catalog);
  revalidatePath('/admin/inventory');
  revalidatePath('/admin/products', 'layout');
  return { ok: true };
}
