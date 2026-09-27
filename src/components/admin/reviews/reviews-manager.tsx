'use client';

import { useState, useTransition, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import { deleteReviewAction, saveReviewAction, setReviewVisibleAction } from '@/app/admin/(dashboard)/reviews/actions';
import { AsyncSwitch } from '@/components/admin/async-switch';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { AdminButton, AdminField, AdminInput, AdminSelect, AdminTextarea } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

export type ReviewRow = {
  id: string;
  productId: string;
  authorName: string;
  rating: number;
  body: string;
  locale: 'en' | 'ar';
  reviewDate: string; // YYYY-MM-DD (Beirut)
  photoUrl: string | null;
  visible: boolean;
};
type Product = { id: string; name: string };

function ReviewForm({ products, review, today, onDone }: { products: Product[]; review: ReviewRow | null; today: string; onDone: () => void }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    start(async () => {
      const r = await saveReviewAction(review?.id ?? null, form);
      if (!r.ok) return setErrors(r.fieldErrors);
      toast.success('Review saved');
      onDone();
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-blue/30 bg-ice/40 p-4">
      {products.length > 1 ? (
        <AdminField id="r-product" label="Product">
          <AdminSelect id="r-product" name="productId" defaultValue={review?.productId ?? products[0]?.id}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
      ) : (
        <input type="hidden" name="productId" value={products[0]?.id ?? ''} />
      )}
      <div className="grid gap-3 sm:grid-cols-4">
        <AdminField id="r-name" label="Customer name" error={errors.authorName} className="sm:col-span-2">
          <AdminInput id="r-name" name="authorName" defaultValue={review?.authorName} maxLength={60} dir="auto" />
        </AdminField>
        <AdminField id="r-rating" label="Rating">
          <AdminSelect id="r-rating" name="rating" defaultValue={String(review?.rating ?? 5)}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)} ({n})
              </option>
            ))}
          </AdminSelect>
        </AdminField>
        <AdminField id="r-locale" label="Language">
          <AdminSelect id="r-locale" name="locale" defaultValue={review?.locale ?? 'en'}>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </AdminSelect>
        </AdminField>
      </div>
      <AdminField id="r-body" label="Review" error={errors.body}>
        <AdminTextarea id="r-body" name="body" rows={4} maxLength={2000} defaultValue={review?.body} dir="auto" />
      </AdminField>
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField id="r-date" label="Date" error={errors.reviewDate}>
          <AdminInput id="r-date" name="reviewDate" type="date" max={today} defaultValue={review?.reviewDate ?? today} />
        </AdminField>
        <AdminField id="r-photo" label="Photo (optional)" error={errors.photo} hint={review?.photoUrl ? 'Choose a file to replace the current photo' : undefined}>
          <input id="r-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
          {review?.photoUrl && <input type="hidden" name="keepPhoto" value={review.photoUrl} />}
        </AdminField>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-navy">
        <input type="checkbox" name="visible" className="size-4 accent-navy" defaultChecked={review?.visible ?? true} />
        Show on the shop
      </label>
      <div className="flex gap-2">
        <AdminButton type="submit" disabled={pending}>
          Save review
        </AdminButton>
        <AdminButton type="button" variant="ghost" onClick={onDone}>
          Cancel
        </AdminButton>
      </div>
    </form>
  );
}

export function ReviewsManager({ rows, products, today }: { rows: ReviewRow[]; products: Product[]; today: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {editing === null && (
        <AdminButton onClick={() => setEditing('new')} disabled={products.length === 0}>
          <Plus /> Add review
        </AdminButton>
      )}
      {editing === 'new' && <ReviewForm products={products} review={null} today={today} onDone={() => setEditing(null)} />}
      <ul className="space-y-3">
        {rows.map((r) =>
          editing === r.id ? (
            <li key={r.id}>
              <ReviewForm products={products} review={r} today={today} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={r.id} data-testid="review-row" className={cn('flex gap-4 rounded-2xl border border-slate-200 bg-white p-4', !r.visible && 'opacity-60')}>
              {r.photoUrl && (
                <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  <Image src={r.photoUrl} alt="" fill sizes="64px" className="object-cover" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex text-amber-400" aria-label={`${r.rating} out of 5`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={cn('size-4', i < r.rating ? 'fill-current' : 'text-slate-300')} />
                    ))}
                  </span>
                  <span className="font-semibold text-navy" dir="auto">
                    {r.authorName}
                  </span>
                  <span className="text-xs text-slate-500">
                    {r.reviewDate} · {r.locale === 'ar' ? 'Arabic' : 'English'}
                  </span>
                </div>
                <p className="mt-1 line-clamp-3 text-sm text-ink/80" dir="auto">
                  {r.body}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <AsyncSwitch
                  className="text-xs"
                  checked={r.visible}
                  label="Visible"
                  onChange={async (next) => {
                    await setReviewVisibleAction(r.id, next);
                    router.refresh();
                    return true;
                  }}
                />
                <div className="flex gap-1">
                  <AdminButton size="sm" variant="secondary" onClick={() => setEditing(r.id)} disabled={editing !== null}>
                    Edit
                  </AdminButton>
                  <AdminButton size="sm" variant="ghost" className="text-red-600" onClick={() => setToDelete(r.id)}>
                    Delete
                  </AdminButton>
                </div>
              </div>
            </li>
          ),
        )}
        {rows.length === 0 && editing !== 'new' && (
          <li className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No reviews yet. Add real reviews from your customers — the shop hides the rating until there is one.
          </li>
        )}
      </ul>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this review?"
        description="It will be removed from the shop and the rating recalculated."
        confirmLabel="Delete review"
        danger
        busy={pending}
        onConfirm={() =>
          start(async () => {
            if (toDelete) await deleteReviewAction(toDelete);
            setToDelete(null);
            router.refresh();
          })
        }
      />
    </div>
  );
}
