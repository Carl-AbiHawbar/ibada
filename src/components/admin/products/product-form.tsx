'use client';

import { useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { saveProductAction } from '@/app/admin/(dashboard)/products/actions';
import { AdminButton, AdminCard, AdminField, AdminInput, AdminSelect, AdminTextarea } from '@/components/admin/ui';

export type ProductFormValues = {
  slug: string;
  nameEn: string;
  nameAr: string;
  taglineEn: string;
  taglineAr: string;
  descriptionEn: string;
  descriptionAr: string;
  seoTitleEn: string;
  seoTitleAr: string;
  seoDescriptionEn: string;
  seoDescriptionAr: string;
  status: 'active' | 'draft';
  lowStockThreshold: number;
};

export const EMPTY_PRODUCT: ProductFormValues = {
  slug: '',
  nameEn: '',
  nameAr: '',
  taglineEn: '',
  taglineAr: '',
  descriptionEn: '',
  descriptionAr: '',
  seoTitleEn: '',
  seoTitleAr: '',
  seoDescriptionEn: '',
  seoDescriptionAr: '',
  status: 'draft',
  lowStockThreshold: 10,
};

type Key = keyof ProductFormValues;
const FORM_ID = 'product-form';

/**
 * The product editor, laid out like Shopify's: details, photos, bundles and the search listing on the left,
 * status and stock on the right. `main` and `side` hold the parts that save on their own (photos, bundles, stock).
 */
export function ProductForm({ id, initial, main, side }: { id: string | null; initial: ProductFormValues; main?: ReactNode; side?: ReactNode }) {
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = (k: Key) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await saveProductAction(id, v);
      if (!r) return; // created → redirected
      if (r.ok) {
        setErrors({});
        setSaved(v);
        toast.success('Product saved');
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error === 'slug_taken' ? 'That web address is already used' : 'Please check the highlighted fields');
      }
    });
  };

  const pair = (label: string, en: Key, ar: Key, opts: { textarea?: boolean; hint?: string; max?: number } = {}) => {
    const Comp = opts.textarea ? AdminTextarea : AdminInput;
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminField id={en} label={`${label} (English)`} hint={opts.hint} error={errors[en]}>
          <Comp id={en} value={String(v[en])} onChange={set(en)} maxLength={opts.max} rows={opts.textarea ? 6 : undefined} />
        </AdminField>
        <AdminField id={ar} label={`${label} (Arabic)`} error={errors[ar]}>
          <Comp id={ar} dir="rtl" lang="ar" value={String(v[ar])} onChange={set(ar)} maxLength={opts.max} rows={opts.textarea ? 6 : undefined} />
        </AdminField>
      </div>
    );
  };

  const seoTitle = v.seoTitleEn || v.nameEn || 'Product title';
  const seoDescription = v.seoDescriptionEn || v.taglineEn || v.descriptionEn.slice(0, 160);

  return (
    <>
      {dirty && (
        <div
          role="region"
          aria-label="Unsaved changes"
          className="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-2 bg-[#1a1a1a] px-4 text-white shadow-lg"
        >
          <span className="flex-1 text-[13px] font-semibold">Unsaved changes</span>
          <AdminButton
            type="button"
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10"
            disabled={pending}
            onClick={() => {
              setV(saved);
              setErrors({});
            }}
          >
            Discard
          </AdminButton>
          <AdminButton type="submit" form={FORM_ID} size="sm" variant="secondary" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </AdminButton>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <AdminCard>
            <div className="space-y-3">
              {pair('Name', 'nameEn', 'nameAr', { max: 80 })}
              {pair('Tagline', 'taglineEn', 'taglineAr', { max: 160, hint: 'One short sentence shown under the headline.' })}
              {pair('Description', 'descriptionEn', 'descriptionAr', { textarea: true, max: 4000 })}
            </div>
          </AdminCard>

          {main}

          <AdminCard title="Search engine listing">
            <div className="mb-4 rounded-lg border border-[#e3e3e3] p-3">
              <p className="text-xs text-[#616161]">ibadashop.com › en › products › {v.slug || '…'}</p>
              <p className="truncate text-[17px] leading-6 text-[#1a0dab]">{seoTitle}</p>
              <p className="line-clamp-2 text-[13px] text-[#4d5156]">{seoDescription || 'Add a description to see how this product might appear in a search engine listing.'}</p>
            </div>
            <div className="space-y-3">
              {pair('SEO title', 'seoTitleEn', 'seoTitleAr', { max: 70, hint: 'Up to 70 characters. Leave empty to use the name.' })}
              {pair('SEO description', 'seoDescriptionEn', 'seoDescriptionAr', { textarea: true, max: 160 })}
            </div>
          </AdminCard>
        </div>

        <div className="space-y-4">
          <AdminCard title="Status">
            <AdminField id="status" label="Visibility" hint="Draft products are hidden from the shop.">
              <AdminSelect id="status" value={v.status} onChange={set('status')}>
                <option value="active">Active (visible)</option>
                <option value="draft">Draft (hidden)</option>
              </AdminSelect>
            </AdminField>
          </AdminCard>

          {side}

          <AdminCard title="Stock alerts">
            <AdminField id="lowStockThreshold" label="Low-stock alert at (devices)" error={errors.lowStockThreshold}>
              <AdminInput id="lowStockThreshold" type="number" min={0} value={v.lowStockThreshold} onChange={set('lowStockThreshold')} />
            </AdminField>
          </AdminCard>

          <AdminCard title="Web address">
            <AdminField id="slug" label="URL handle" hint={`ibadashop.com/en/products/${v.slug || '…'}`} error={errors.slug}>
              <AdminInput id="slug" value={v.slug} onChange={(e) => setV((s) => ({ ...s, slug: e.target.value.toLowerCase() }))} maxLength={60} />
            </AdminField>
          </AdminCard>
        </div>
      </div>

      <form id={FORM_ID} onSubmit={submit} className="mt-4 flex justify-end border-t border-[#e3e3e3] pt-4">
        <AdminButton type="submit" disabled={pending || (!!id && !dirty)}>
          {pending ? 'Saving…' : id ? 'Save product' : 'Create product'}
        </AdminButton>
      </form>
    </>
  );
}
