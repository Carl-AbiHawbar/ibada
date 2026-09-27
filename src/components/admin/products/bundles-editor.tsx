'use client';

import { useState, useTransition, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { reorderAction, saveBundleAction, setDefaultBundleAction } from '@/app/admin/(dashboard)/products/actions';
import { AdminButton, AdminCard, AdminField, AdminInput, AdminSelect } from '@/components/admin/ui';
import { formatUsd, perUnitCents, savePercent } from '@/lib/money';
import { cn } from '@/lib/utils';

type Bundle = {
  id: string;
  nameEn: string;
  nameAr: string;
  subtitleEn: string;
  subtitleAr: string;
  units: number;
  priceCents: number;
  compareAtCents: number | null;
  badge: 'none' | 'most_popular' | 'best_value';
  imageId: string | null;
  isDefault: boolean;
  active: boolean;
};
type Img = { id: string; url: string };

const BADGES = { none: 'No badge', most_popular: 'MOST POPULAR', best_value: 'BEST VALUE' } as const;
const dollars = (c: number | null) => (c === null ? '' : (c / 100).toString());

function BundleForm({ productId, bundle, images, onDone }: { productId: string; bundle: Bundle | null; images: Img[]; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({
    nameEn: bundle?.nameEn ?? '',
    nameAr: bundle?.nameAr ?? '',
    subtitleEn: bundle?.subtitleEn ?? '',
    subtitleAr: bundle?.subtitleAr ?? '',
    units: String(bundle?.units ?? 1),
    price: dollars(bundle?.priceCents ?? null),
    compareAt: dollars(bundle?.compareAtCents ?? null),
    badge: bundle?.badge ?? 'none',
    imageId: bundle?.imageId ?? '',
    active: bundle?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));

  const priceC = Math.round(Number(v.price) * 100);
  const compareC = v.compareAt ? Math.round(Number(v.compareAt) * 100) : null;
  const units = Math.max(1, Number(v.units) || 1);
  const save = priceC > 0 ? savePercent(priceC, compareC) : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await saveBundleAction(productId, bundle?.id ?? null, { ...v, units: Number(v.units) });
      if (r.ok) {
        toast.success('Bundle saved');
        onDone();
        router.refresh();
      } else setErrors(r.fieldErrors ?? {});
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-blue/30 bg-ice/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField id="b-nameEn" label="Name (English)" error={errors.nameEn}>
          <AdminInput id="b-nameEn" value={v.nameEn} onChange={set('nameEn')} maxLength={60} />
        </AdminField>
        <AdminField id="b-nameAr" label="Name (Arabic)" error={errors.nameAr}>
          <AdminInput id="b-nameAr" dir="rtl" value={v.nameAr} onChange={set('nameAr')} maxLength={60} />
        </AdminField>
        <AdminField id="b-subEn" label="Subtitle (English)" hint="e.g. Up to 100m² coverage">
          <AdminInput id="b-subEn" value={v.subtitleEn} onChange={set('subtitleEn')} maxLength={80} />
        </AdminField>
        <AdminField id="b-subAr" label="Subtitle (Arabic)">
          <AdminInput id="b-subAr" dir="rtl" value={v.subtitleAr} onChange={set('subtitleAr')} maxLength={80} />
        </AdminField>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminField id="b-units" label="Devices in pack" error={errors.units}>
          <AdminInput id="b-units" type="number" min={1} max={20} value={v.units} onChange={set('units')} />
        </AdminField>
        <AdminField id="b-price" label="Price (USD)" error={errors.price}>
          <AdminInput id="b-price" type="number" min={0.01} step={0.01} inputMode="decimal" value={v.price} onChange={set('price')} />
        </AdminField>
        <AdminField id="b-compare" label="Was price (USD)" error={errors.compareAt} hint="Optional, shown crossed out">
          <AdminInput id="b-compare" type="number" min={0.01} step={0.01} inputMode="decimal" value={v.compareAt} onChange={set('compareAt')} />
        </AdminField>
        <AdminField id="b-badge" label="Badge">
          <AdminSelect id="b-badge" value={v.badge} onChange={set('badge')}>
            {Object.entries(BADGES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
      </div>
      <p className="text-sm font-semibold text-blue" aria-live="polite">
        {priceC > 0 ? `${save !== null ? `Save ${save}% · ` : ''}${formatUsd(perUnitCents(priceC, units))} per device` : 'Enter a price'}
      </p>
      <div>
        <p className="mb-2 text-sm font-semibold text-navy">Photo</p>
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              aria-pressed={v.imageId === img.id}
              onClick={() => setV((s) => ({ ...s, imageId: img.id }))}
              className={cn('relative size-16 overflow-hidden rounded-xl border-2 bg-white', v.imageId === img.id ? 'border-navy' : 'border-slate-200')}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-contain p-1" />
            </button>
          ))}
        </div>
        {errors.imageId && <p className="mt-1 text-sm text-red-600">{errors.imageId}</p>}
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-navy">
        <input type="checkbox" className="size-4 accent-navy" checked={v.active} onChange={(e) => setV((s) => ({ ...s, active: e.target.checked }))} />
        Visible in the shop
      </label>
      <div className="flex gap-2">
        <AdminButton type="submit" disabled={pending}>
          Save bundle
        </AdminButton>
        <AdminButton type="button" variant="ghost" onClick={onDone}>
          Cancel
        </AdminButton>
      </div>
    </form>
  );
}

export function BundlesEditor({ productId, bundles, images }: { productId: string; bundles: Bundle[]; images: Img[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [pending, start] = useTransition();
  const imageUrl = (id: string | null) => images.find((i) => i.id === id)?.url ?? null;

  const move = (i: number, dir: -1 | 1) =>
    start(async () => {
      const ids = bundles.map((b) => b.id);
      const j = i + dir;
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
      await reorderAction('bundles', productId, ids);
      router.refresh();
    });

  return (
    <AdminCard
      title="Bundles & prices"
      actions={
        editing === null && (
          <AdminButton size="sm" variant="secondary" onClick={() => setEditing('new')}>
            <Plus /> Add bundle
          </AdminButton>
        )
      }
    >
      <ul className="space-y-3">
        {bundles.map((b, i) =>
          editing === b.id ? (
            <li key={b.id}>
              <BundleForm productId={productId} bundle={b} images={images} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li
              key={b.id}
              data-testid={`bundle-row-${b.nameEn}`}
              className={cn('flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 p-3', !b.active && 'opacity-60')}
            >
              <span className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {imageUrl(b.imageId) && <Image src={imageUrl(b.imageId)!} alt="" fill sizes="48px" className="object-contain p-1" />}
              </span>
              <div className="min-w-40 flex-1">
                <p className="font-semibold text-navy">
                  {b.nameEn}
                  {b.badge !== 'none' && <span className="ms-2 rounded-full bg-blue px-2 py-0.5 text-[10px] font-bold text-white">{BADGES[b.badge]}</span>}
                  {!b.active && <span className="ms-2 text-xs text-slate-500">(hidden)</span>}
                </p>
                <p className="text-sm text-slate-500">
                  {b.units} device{b.units === 1 ? '' : 's'} · {formatUsd(b.priceCents)}
                  {b.compareAtCents ? ` (was ${formatUsd(b.compareAtCents)}, save ${savePercent(b.priceCents, b.compareAtCents)}%)` : ''} · {formatUsd(perUnitCents(b.priceCents, b.units))}/device
                </p>
              </div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <input
                  type="radio"
                  name="default-bundle"
                  className="accent-navy"
                  checked={b.isDefault}
                  onChange={() => start(async () => { await setDefaultBundleAction(productId, b.id); router.refresh(); })}
                />
                Pre-selected
              </label>
              <div className="flex items-center">
                <button type="button" aria-label="Move up" disabled={i === 0 || pending} onClick={() => move(i, -1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" aria-label="Move down" disabled={i === bundles.length - 1 || pending} onClick={() => move(i, 1)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30">
                  <ArrowDown className="size-4" />
                </button>
                <AdminButton size="sm" variant="secondary" onClick={() => setEditing(b.id)} disabled={editing !== null}>
                  Edit
                </AdminButton>
              </div>
            </li>
          ),
        )}
        {editing === 'new' && (
          <li>
            <BundleForm productId={productId} bundle={null} images={images} onDone={() => setEditing(null)} />
          </li>
        )}
      </ul>
    </AdminCard>
  );
}
