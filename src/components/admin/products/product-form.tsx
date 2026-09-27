'use client';

import { useState, useTransition, type FormEvent } from 'react';
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

export function ProductForm({ id, initial }: { id: string | null; initial: ProductFormValues }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = (k: Key) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await saveProductAction(id, v);
      if (!r) return; // created → redirected
      if (r.ok) {
        setErrors({});
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
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField id={en} label={`${label} (English)`} hint={opts.hint} error={errors[en]}>
          <Comp id={en} value={String(v[en])} onChange={set(en)} maxLength={opts.max} rows={opts.textarea ? 6 : undefined} />
        </AdminField>
        <AdminField id={ar} label={`${label} (Arabic)`} error={errors[ar]}>
          <Comp id={ar} dir="rtl" lang="ar" value={String(v[ar])} onChange={set(ar)} maxLength={opts.max} rows={opts.textarea ? 6 : undefined} />
        </AdminField>
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <AdminCard title="Details">
        <div className="space-y-4">
          {pair('Name', 'nameEn', 'nameAr', { max: 80 })}
          {pair('Tagline', 'taglineEn', 'taglineAr', { max: 160, hint: 'One short sentence shown under the headline.' })}
          {pair('Description', 'descriptionEn', 'descriptionAr', { textarea: true, max: 4000 })}
        </div>
      </AdminCard>

      <AdminCard title="Search engines">
        <div className="space-y-4">
          {pair('SEO title', 'seoTitleEn', 'seoTitleAr', { max: 70, hint: 'Up to 70 characters. Leave empty to use the name.' })}
          {pair('SEO description', 'seoDescriptionEn', 'seoDescriptionAr', { textarea: true, max: 160 })}
          <AdminField id="slug" label="Web address" hint={`ibadashop.com/en/products/${v.slug || '…'}`} error={errors.slug}>
            <AdminInput id="slug" value={v.slug} onChange={(e) => setV((s) => ({ ...s, slug: e.target.value.toLowerCase() }))} maxLength={60} />
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard title="Status & stock alerts">
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField id="status" label="Status" hint="Draft products are hidden from the shop.">
            <AdminSelect id="status" value={v.status} onChange={set('status')}>
              <option value="active">Active (visible)</option>
              <option value="draft">Draft (hidden)</option>
            </AdminSelect>
          </AdminField>
          <AdminField id="lowStockThreshold" label="Low-stock alert at (devices)" error={errors.lowStockThreshold}>
            <AdminInput id="lowStockThreshold" type="number" min={0} value={v.lowStockThreshold} onChange={set('lowStockThreshold')} />
          </AdminField>
        </div>
      </AdminCard>

      <div className="sticky bottom-20 z-30 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <AdminButton type="submit" disabled={pending}>
          {pending ? 'Saving…' : id ? 'Save product' : 'Create product'}
        </AdminButton>
      </div>
    </form>
  );
}
