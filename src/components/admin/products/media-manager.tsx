'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteImageAction, reorderAction, updateImageAltAction, uploadImagesAction } from '@/app/admin/(dashboard)/products/actions';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { AdminCard, AdminInput } from '@/components/admin/ui';
import { cn } from '@/lib/utils';

type Img = { id: string; url: string; altEn: string; altAr: string };

export function MediaManager({ productId, images }: { productId: string; images: Img[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [drag, setDrag] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const upload = (files: FileList | File[]) =>
    start(async () => {
      let added = 0;
      for (const file of Array.from(files).slice(0, 10)) {
        const form = new FormData();
        form.append('files', file);
        const r = await uploadImagesAction(productId, form);
        added += r.added;
        r.errors.forEach((e) => toast.error(e));
      }
      if (added) toast.success(`${added} photo${added === 1 ? '' : 's'} added`);
      if (input.current) input.current.value = '';
      router.refresh();
    });

  const move = (i: number, dir: -1 | 1) =>
    start(async () => {
      const ids = images.map((m) => m.id);
      const j = i + dir;
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
      await reorderAction('images', productId, ids);
      router.refresh();
    });

  return (
    <AdminCard title="Photos">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.id} data-testid="media-item" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="relative aspect-square bg-slate-50">
              <Image src={img.url} alt={img.altEn} fill sizes="200px" className="object-contain p-2" />
              {i === 0 && <span className="absolute start-2 top-2 rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold text-white">MAIN</span>}
            </div>
            <div className="space-y-2 p-2">
              <AdminInput
                aria-label="Description (English)"
                placeholder="Description (English)"
                defaultValue={img.altEn}
                className="h-9 text-xs"
                onBlur={(e) => e.target.value !== img.altEn && start(() => updateImageAltAction(img.id, e.target.value, img.altAr))}
              />
              <AdminInput
                aria-label="Description (Arabic)"
                placeholder="الوصف بالعربية"
                dir="rtl"
                defaultValue={img.altAr}
                className="h-9 text-xs"
                onBlur={(e) => e.target.value !== img.altAr && start(() => updateImageAltAction(img.id, img.altEn, e.target.value))}
              />
              <div className="flex items-center justify-between">
                <div className="flex">
                  <button type="button" aria-label="Move earlier" disabled={i === 0 || pending} onClick={() => move(i, -1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move later"
                    disabled={i === images.length - 1 || pending}
                    onClick={() => move(i, 1)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
                <button type="button" aria-label="Delete photo" onClick={() => setToDelete(img.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
        <li>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              upload(e.dataTransfer.files);
            }}
            className={cn(
              'flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center text-sm font-semibold transition',
              drag ? 'border-blue bg-blue/5 text-blue' : 'border-slate-300 text-slate-500 hover:border-navy hover:text-navy',
              pending && 'pointer-events-none opacity-60',
            )}
          >
            <ImagePlus className="size-7" aria-hidden />
            {pending ? 'Uploading…' : 'Add photos'}
            <span className="px-2 text-xs font-normal">JPEG, PNG, WebP · max 5 MB</span>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              aria-label="Upload photos"
              className="sr-only"
              onChange={(e) => e.target.files && upload(e.target.files)}
            />
          </label>
        </li>
      </ul>
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this photo?"
        description="It will be removed from the shop. Bundles using it will show no photo until you pick another."
        confirmLabel="Delete photo"
        danger
        busy={pending}
        onConfirm={() =>
          start(async () => {
            if (toDelete) await deleteImageAction(toDelete);
            setToDelete(null);
            router.refresh();
          })
        }
      />
    </AdminCard>
  );
}
