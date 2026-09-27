'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { beirutDayStart } from '@/lib/dates';
import { audit } from '@/server/audit';
import { getDb } from '@/server/db/client';
import { processImage } from '@/server/images';
import { requireAdmin } from '@/server/next/admin-session';
import { invalidate, TAGS } from '@/server/next/cache';
import { requestIp } from '@/server/next/request';
import { deleteReview, saveReview, setReviewVisible } from '@/server/reviews';
import { getStorage } from '@/server/storage';

const id = z.uuid();

async function changed(userId: string, summary: string, entityId?: string) {
  await audit(getDb(), { userId, action: 'review.updated', entity: 'review', entityId, summary, ip: await requestIp() });
  invalidate(TAGS.reviews);
  revalidatePath('/admin/reviews');
}

/** Form fields: productId, authorName, rating, body, locale, reviewDate (YYYY-MM-DD), visible, photo?, keepPhoto? */
export async function saveReviewAction(
  reviewId: string | null,
  form: FormData,
): Promise<{ ok: true } | { ok: false; fieldErrors: Record<string, string> }> {
  const { user } = await requireAdmin('reviews');
  if (reviewId && !id.safeParse(reviewId).success) return { ok: false, fieldErrors: { form: 'Invalid review' } };

  let photoUrl = String(form.get('keepPhoto') ?? '') || null;
  const photo = form.get('photo');
  if (photo instanceof File && photo.size > 0) {
    const img = await processImage(Buffer.from(await photo.arrayBuffer()));
    if (!img.ok) return { ok: false, fieldErrors: { photo: img.error === 'too_large' ? 'Photo is larger than 5 MB' : 'Use a JPEG, PNG or WebP photo' } };
    photoUrl = (await getStorage().put(`reviews/${crypto.randomUUID()}.webp`, img.data, 'image/webp')).url;
  }
  const date = String(form.get('reviewDate') ?? '');
  const r = await saveReview(getDb(), {
    id: reviewId ?? undefined,
    input: {
      productId: String(form.get('productId') ?? ''),
      authorName: String(form.get('authorName') ?? ''),
      rating: Number(form.get('rating')),
      body: String(form.get('body') ?? ''),
      locale: form.get('locale') === 'ar' ? 'ar' : 'en',
      reviewDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? beirutDayStart(date) : new Date(),
      photoUrl,
      visible: form.get('visible') === 'on',
    },
  });
  if (!r.ok) return { ok: false, fieldErrors: r.fieldErrors ?? {} };
  await changed(user.id, `${reviewId ? 'Edited' : 'Added'} a review by ${String(form.get('authorName') ?? '').slice(0, 40)}`, r.id);
  return { ok: true };
}

export async function setReviewVisibleAction(reviewId: string, visible: boolean): Promise<void> {
  const { user } = await requireAdmin('reviews');
  if (!id.safeParse(reviewId).success) return;
  await setReviewVisible(getDb(), reviewId, Boolean(visible));
  await changed(user.id, visible ? 'Showed a review' : 'Hid a review', reviewId);
}

export async function deleteReviewAction(reviewId: string): Promise<void> {
  const { user } = await requireAdmin('reviews');
  if (!id.safeParse(reviewId).success) return;
  const r = await deleteReview(getDb(), reviewId);
  if (r?.photoUrl) await getStorage().remove(r.photoUrl).catch(() => {});
  await changed(user.id, 'Deleted a review', reviewId);
}
