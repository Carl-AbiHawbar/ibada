'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { saveSettingsAction, type SettingsFormValues } from '@/app/admin/(dashboard)/settings/actions';
import { AdminButton, AdminCard, AdminField, AdminInput } from '@/components/admin/ui';

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = (k: keyof SettingsFormValues) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const field = (k: keyof SettingsFormValues, label: string, opts: { hint?: string; rtl?: boolean; type?: string; max?: number } = {}) => (
    <AdminField id={k} label={label} hint={opts.hint} error={errors[k]}>
      <AdminInput id={k} type={opts.type ?? 'text'} dir={opts.rtl ? 'rtl' : undefined} maxLength={opts.max} value={String(v[k])} onChange={set(k)} />
    </AdminField>
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await saveSettingsAction(v);
      if (!r.ok) {
        setErrors(r.fieldErrors);
        toast.error('Please check the highlighted fields');
        return;
      }
      setErrors({});
      toast.success('Settings saved');
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <AdminCard title="Store">
        <div className="grid gap-4 sm:grid-cols-2">
          {field('storeName', 'Store name', { max: 60 })}
          {field('contactPhone', 'Contact phone', { hint: 'Shown in the footer and contact page, and used for WhatsApp' })}
          {field('contactEmail', 'Contact email', { type: 'email' })}
        </div>
      </AdminCard>

      <AdminCard title="Announcement bar">
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-navy">
            <input type="checkbox" className="size-4 accent-navy" checked={v.announcementEnabled} onChange={(e) => setV((s) => ({ ...s, announcementEnabled: e.target.checked }))} />
            Show the announcement bar
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('announcementEn', 'Announcement (English)', { max: 140 })}
            {field('announcementAr', 'Announcement (Arabic)', { max: 140, rtl: true })}
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Delivery">
        <div className="grid gap-4 sm:grid-cols-2">
          {field('deliveryFee', 'Delivery fee (USD)', { type: 'number', hint: '0 = free delivery' })}
          {field('freeDeliveryThreshold', 'Free delivery on orders from (USD)', { type: 'number', hint: 'Optional' })}
          {field('deliveryTimeEn', 'Delivery time text (English)', { max: 120 })}
          {field('deliveryTimeAr', 'Delivery time text (Arabic)', { max: 120, rtl: true })}
        </div>
      </AdminCard>

      <AdminCard title="Social & reviews">
        <div className="grid gap-4 sm:grid-cols-2">
          {field('instagram', 'Instagram link', { hint: 'https://instagram.com/…' })}
          {field('facebook', 'Facebook link')}
          {field('tiktok', 'TikTok link')}
          {field('trustpilotUrl', 'Trustpilot page', { hint: 'Only if you have a real Trustpilot page. The star rating links there.' })}
        </div>
      </AdminCard>

      <div className="sticky bottom-20 z-30 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        <AdminButton type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </AdminButton>
      </div>
    </form>
  );
}
