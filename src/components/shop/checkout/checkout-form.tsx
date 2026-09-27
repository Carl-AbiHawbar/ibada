'use client';

import { useEffect, useRef, useState, useSyncExternalStore, useTransition, type FormEvent } from 'react';
import Image from 'next/image';
import { Banknote, Lock, ShoppingBag, Tag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  applyDiscountAction,
  placeOrderAction,
  quoteCartAction,
  type CartQuoteResult,
  type DiscountPreview,
} from '@/app/[locale]/(shop)/actions';
import { useCart } from '@/components/shop/cart/cart-provider';
import { Turnstile, type TurnstileHandle } from '@/components/shop/turnstile';
import { Link } from '@/i18n/navigation';
import { GOVERNORATES } from '@/lib/lebanon';
import { formatUsd } from '@/lib/money';
import { track } from '@/lib/track';
import { cn } from '@/lib/utils';
import { describe, Field, inputClass } from './field';

const noop = () => () => {};
const useIsClient = () => useSyncExternalStore(noop, () => true, () => false);

type FormState = {
  name: string;
  phone: string;
  governorate: string;
  district: string;
  town: string;
  addressLine: string;
  landmark: string;
  notes: string;
};
const EMPTY_FORM: FormState = { name: '', phone: '', governorate: '', district: '', town: '', addressLine: '', landmark: '', notes: '' };

export function CheckoutForm({ siteKey }: { siteKey: string }) {
  const t = useTranslations('checkout');
  const te = useTranslations('errors');
  const tc = useTranslations('common');
  const locale = useLocale() as 'en' | 'ar';
  const isClient = useIsClient();
  const { lines, replace } = useCart();

  const [quote, setQuote] = useState<CartQuoteResult | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [discount, setDiscount] = useState<Extract<DiscountPreview, { ok: true }> | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [idempotencyKey] = useState(() => (typeof crypto !== 'undefined' ? crypto.randomUUID() : ''));
  const [submitting, startSubmit] = useTransition();
  const [applying, startApply] = useTransition();
  const turnstile = useRef<TurnstileHandle>(null);

  useEffect(() => track('begin_checkout'), []);

  // Price the cart on the server whenever it changes.
  useEffect(() => {
    if (!isClient) return;
    let cancelled = false;
    quoteCartAction(lines).then((q) => {
      if (cancelled) return;
      if (q.removed.length > 0) {
        replace(q.lines.map((l) => ({ bundleId: l.bundleId, quantity: l.quantity })));
        setFormError(te('cart_changed'));
      }
      setQuote(q);
      setDiscount(null);
    });
    return () => {
      cancelled = true;
    };
  }, [isClient, lines, replace, te]);

  const set = (key: keyof FormState) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value, ...(key === 'governorate' ? { district: '' } : {}) }));
    setFieldErrors((e) => ({ ...e, [key]: '' }));
  };
  const districts = GOVERNORATES.find((g) => g.id === form.governorate)?.districts ?? [];
  const err = (key: string) => (fieldErrors[key] ? te(fieldErrors[key] as 'invalid_name') : undefined);

  const applyCode = () => {
    setDiscountError(null);
    startApply(async () => {
      const r = await applyDiscountAction({ code: discountInput, lines });
      if (r.ok) setDiscount(r);
      else {
        setDiscount(null);
        setDiscountError(te(`discount.${r.reason}`));
      }
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    startSubmit(async () => {
      const r = await placeOrderAction({
        idempotencyKey,
        locale,
        cart: lines,
        ...form,
        discountCode: discount?.code ?? '',
        turnstileToken: token,
      });
      if (!r) return; // redirected to the confirmation page
      if (r.error === 'invalid') {
        setFieldErrors(r.fieldErrors ?? {});
        setFormError(te('form'));
        return;
      }
      // The bot-check token was spent by the server; get a fresh one for the retry.
      turnstile.current?.reset();
      if (r.error === 'out_of_stock') setFormError(te('out_of_stock', { name: r.productName?.[locale] ?? '' }));
      else if (r.error === 'discount_invalid') {
        setDiscount(null);
        setFormError(r.discountReason ? te(`discount.${r.discountReason}`) : te('discount_invalid'));
      } else if (r.error === 'cart_changed') {
        setFormError(te('cart_changed'));
        const q = await quoteCartAction(lines);
        replace(q.lines.map((l) => ({ bundleId: l.bundleId, quantity: l.quantity })));
        setQuote(q);
      } else setFormError(te(r.error));
    });
  };

  if (!isClient || (lines.length > 0 && !quote)) {
    return <div className="h-96 animate-pulse rounded-3xl bg-ice" aria-label={tc('loading')} />;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl border border-line bg-white px-6 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-ice text-navy">
          <ShoppingBag className="size-7" aria-hidden />
        </span>
        <h2 className="text-xl font-extrabold text-navy">{t('emptyTitle')}</h2>
        <p className="text-muted-ink">{t('emptyBody')}</p>
        <Link href="/" className="mt-2 inline-flex h-12 items-center rounded-full bg-navy px-6 font-bold text-white hover:bg-navy-700">
          {t('backToShop')}
        </Link>
      </div>
    );
  }

  const totals = discount ?? {
    subtotalCents: quote!.subtotalCents,
    discountCents: 0,
    deliveryCents: quote!.deliveryCents,
    totalCents: quote!.totalCents,
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-start">
      <div className="order-2 space-y-8 lg:order-1">
        <fieldset className="space-y-4 rounded-3xl border border-line bg-white p-5 sm:p-7">
          <legend className="float-start mb-1 w-full text-lg font-extrabold text-navy">{t('contact')}</legend>
          <div className="clear-both" />
          <Field id="name" label={t('name')} error={err('name')}>
            <input
              id="name"
              className={inputClass}
              autoComplete="name"
              value={form.name}
              onChange={(e) => set('name')(e.target.value)}
              {...describe('name', err('name'))}
            />
          </Field>
          <Field id="phone" label={t('phone')} hint={t('phoneHint')} error={err('phone')}>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              autoComplete="tel-national"
              placeholder="03 123 456"
              className={cn(inputClass, 'text-start rtl:text-end')}
              value={form.phone}
              onChange={(e) => set('phone')(e.target.value)}
              {...describe('phone', err('phone'), t('phoneHint'))}
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-4 rounded-3xl border border-line bg-white p-5 sm:p-7">
          <legend className="float-start mb-1 w-full text-lg font-extrabold text-navy">{t('delivery')}</legend>
          <div className="clear-both" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="governorate" label={t('governorate')} error={err('governorate')}>
              <select
                id="governorate"
                className={inputClass}
                value={form.governorate}
                onChange={(e) => set('governorate')(e.target.value)}
                {...describe('governorate', err('governorate'))}
              >
                <option value="">{t('choose')}</option>
                {GOVERNORATES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g[locale]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="district" label={t('district')} error={err('district')}>
              <select
                id="district"
                className={inputClass}
                value={form.district}
                disabled={!form.governorate}
                onChange={(e) => set('district')(e.target.value)}
                {...describe('district', err('district'))}
              >
                <option value="">{t('choose')}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d[locale]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field id="town" label={t('town')} error={err('town')}>
            <input
              id="town"
              className={inputClass}
              autoComplete="address-level2"
              value={form.town}
              onChange={(e) => set('town')(e.target.value)}
              {...describe('town', err('town'))}
            />
          </Field>
          <Field id="addressLine" label={t('address')} hint={t('addressHint')} error={err('addressLine')}>
            <input
              id="addressLine"
              className={inputClass}
              autoComplete="street-address"
              value={form.addressLine}
              onChange={(e) => set('addressLine')(e.target.value)}
              {...describe('addressLine', err('addressLine'), t('addressHint'))}
            />
          </Field>
          <Field id="landmark" label={t('landmark')} hint={t('landmarkHint')} error={err('landmark')}>
            <input
              id="landmark"
              className={inputClass}
              value={form.landmark}
              onChange={(e) => set('landmark')(e.target.value)}
              {...describe('landmark', err('landmark'), t('landmarkHint'))}
            />
          </Field>
          <Field id="notes" label={t('notes')} error={err('notes')}>
            <textarea
              id="notes"
              rows={3}
              className={cn(inputClass, 'h-auto py-3')}
              value={form.notes}
              onChange={(e) => set('notes')(e.target.value)}
              {...describe('notes', err('notes'))}
            />
          </Field>
        </fieldset>

        {formError && (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {formError}
          </p>
        )}

        <Turnstile ref={turnstile} siteKey={siteKey} locale={locale} onToken={setToken} onExpire={() => setToken('')} />

        <button
          type="submit"
          disabled={submitting || !token}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-navy text-base font-extrabold tracking-wide text-white shadow-[0_12px_30px_-12px_rgba(1,39,85,0.8)] transition hover:bg-navy-700 disabled:cursor-wait disabled:opacity-70"
        >
          <Lock className="size-4" aria-hidden />
          {submitting ? t('placing') : !token ? t('verifying') : t('placeOrder')}
        </button>
        <p className="text-center text-xs text-muted-ink">{t('agree')}</p>
      </div>

      <aside className="order-1 space-y-4 rounded-3xl border border-line bg-ice/60 p-5 sm:p-7 lg:sticky lg:top-24 lg:order-2">
        <h2 className="text-lg font-extrabold text-navy">{t('summary')}</h2>
        <ul className="space-y-3">
          {quote!.lines.map((l) => (
            <li key={l.bundleId} className="flex items-center gap-3">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-line bg-white">
                {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="64px" className="object-contain p-1" />}
                <span className="absolute -end-1 -top-1 flex size-5 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">
                  {l.quantity}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold leading-tight text-navy">{l.bundleName[locale]}</span>
                <span className="block text-sm text-muted-ink">{l.productName[locale]}</span>
              </span>
              <span className="font-bold text-navy">{formatUsd(l.lineTotalCents)}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-1.5">
          <label htmlFor="discount" className="flex items-center gap-1.5 text-sm font-semibold text-navy">
            <Tag className="size-4" aria-hidden /> {t('discount')}
          </label>
          <div className="flex gap-2">
            <input
              id="discount"
              className={cn(inputClass, 'h-11 uppercase')}
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyCode();
                }
              }}
              maxLength={32}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={applyCode}
              disabled={applying || !discountInput.trim()}
              className="h-11 shrink-0 rounded-xl border-2 border-navy px-4 text-sm font-bold text-navy transition hover:bg-navy hover:text-white disabled:opacity-40"
            >
              {t('apply')}
            </button>
          </div>
          {discountError && <p className="text-sm font-medium text-red-600">{discountError}</p>}
          {discount && <p className="text-sm font-medium text-blue">{t('discountApplied', { code: discount.code })}</p>}
        </div>

        <dl className="space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-ink">{t('subtotal')}</dt>
            <dd className="font-semibold text-navy">{formatUsd(totals.subtotalCents)}</dd>
          </div>
          {totals.discountCents > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-ink">{t('discountLine')}</dt>
              <dd data-testid="summary-discount" className="font-semibold text-blue">
                {formatUsd(-totals.discountCents)}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-ink">{t('delivery_fee')}</dt>
            <dd data-testid="summary-delivery" className="font-semibold text-blue">
              {totals.deliveryCents > 0 ? formatUsd(totals.deliveryCents) : tc('free')}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="text-base font-bold text-navy">{t('total')}</dt>
            <dd data-testid="summary-total" className="text-2xl font-extrabold text-navy">
              {formatUsd(totals.totalCents)}
            </dd>
          </div>
        </dl>

        <div data-testid="summary-payment" className="flex items-start gap-3 rounded-2xl border border-blue/30 bg-white p-4">
          <Banknote className="mt-0.5 size-5 shrink-0 text-blue" aria-hidden />
          <div>
            <p className="font-bold text-navy">
              {t('payment')}: {t('cod')}
            </p>
            <p className="text-sm text-muted-ink">{t('codHint')}</p>
          </div>
        </div>
      </aside>
    </form>
  );
}
