'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { Check, PackageSearch } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { trackOrderAction } from '@/app/[locale]/(shop)/actions';
import { Turnstile, type TurnstileHandle } from '@/components/shop/turnstile';
import type { OrderStatus } from '@/lib/order-status';
import { formatUsd } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { TrackView } from '@/server/orders/manage';
import { Field, inputClass } from './field';

const HAPPY_PATH: OrderStatus[] = ['new', 'confirmed', 'out_for_delivery', 'delivered'];

export function TrackForm({ siteKey }: { siteKey: string }) {
  const t = useTranslations('track');
  const te = useTranslations('errors');
  const locale = useLocale() as 'en' | 'ar';
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [order, setOrder] = useState<TrackView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const turnstile = useRef<TurnstileHandle>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await trackOrderAction({ number, phone, turnstileToken: token });
      turnstile.current?.reset();
      if (r.ok) setOrder(r.order);
      else {
        setOrder(null);
        setError(r.error === 'not_found' ? t('notFound') : te(r.error));
      }
    });
  };

  const steps = order && !HAPPY_PATH.includes(order.status) ? [...HAPPY_PATH.slice(0, 1), order.status] : HAPPY_PATH;
  const reached = new Set(order?.timeline.map((e) => e.status));

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-4 rounded-3xl border border-line bg-white p-5 sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="track-number" label={t('number')}>
            <input
              id="track-number"
              inputMode="numeric"
              dir="ltr"
              className={inputClass}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="1001"
              required
            />
          </Field>
          <Field id="track-phone" label={t('phone')}>
            <input
              id="track-phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03 123 456"
              required
            />
          </Field>
        </div>
        <Turnstile ref={turnstile} siteKey={siteKey} locale={locale} onToken={setToken} onExpire={() => setToken('')} />
        <button
          type="submit"
          disabled={pending || !token}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-navy font-extrabold text-white transition hover:bg-navy-700 disabled:opacity-60"
        >
          <PackageSearch className="size-5" aria-hidden /> {t('submit')}
        </button>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </form>

      {order && (
        <div data-testid="track-result" className="rounded-3xl border border-line bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xl font-extrabold text-navy" dir="ltr">
              #{order.number}
            </p>
            <span className="rounded-full bg-blue/10 px-3 py-1 text-sm font-bold text-blue">{t(`status.${order.status}`)}</span>
          </div>
          <p className="mt-1 text-sm text-muted-ink">
            {t('placed', {
              date: new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB-u-nu-latn' : 'en-GB', {
                dateStyle: 'medium',
                timeZone: 'Asia/Beirut',
              }).format(new Date(order.createdAt)),
            })}
          </p>

          <ol className="mt-6 space-y-4">
            {steps.map((s) => {
              const done = reached.has(s);
              return (
                <li key={s} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full border-2',
                      done ? 'border-blue bg-blue text-white' : 'border-line text-transparent',
                    )}
                  >
                    <Check className="size-4" strokeWidth={3} aria-hidden />
                  </span>
                  <span className={cn('font-semibold', done ? 'text-navy' : 'text-muted-ink')}>{t(`status.${s}`)}</span>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 border-t border-line pt-4">
            <p className="text-sm font-bold text-navy">{t('items')}</p>
            <ul className="mt-2 space-y-1 text-sm text-ink/80">
              {order.items.map((i, idx) => (
                <li key={idx}>
                  {i.bundleName[locale]} ×{i.quantity}
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between font-bold text-navy">
              <span>{t('total')}</span>
              <span>{formatUsd(order.totalCents)}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
