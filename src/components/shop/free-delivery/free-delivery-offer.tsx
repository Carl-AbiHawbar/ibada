'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { CircleCheck, Truck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { claimFreeDeliveryAction } from '@/app/[locale]/(shop)/actions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from '@/i18n/navigation';
import { describe, Field, inputClass } from '../checkout/field';
import { Turnstile, type TurnstileHandle } from '../turnstile';

type Form = { name: string; email: string; phone: string; marketingOptIn: boolean };
const EMPTY: Form = { name: '', email: '', phone: '', marketingOptIn: false };

/** Floating "Free delivery" button (lower corner) and the form that unlocks it. */
export function FreeDeliveryOffer({
  siteKey,
  showButton,
  open,
  onOpenChange,
  onClaimed,
}: {
  siteKey: string;
  showButton: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed: () => void;
}) {
  const t = useTranslations('freeDelivery');
  const locale = useLocale() as 'en' | 'ar';
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [token, setToken] = useState('');
  const [pending, start] = useTransition();
  const turnstile = useRef<TurnstileHandle>(null);

  const set = (key: 'name' | 'email' | 'phone') => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
  };
  const err = (key: string) => (errors[key] ? t(`errors.${errors[key]}` as 'errors.required') : undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    start(async () => {
      try {
        const r = await claimFreeDeliveryAction({ ...form, locale, turnstileToken: token });
        if (r.ok) {
          setDone(true);
          onClaimed();
          return;
        }
        turnstile.current?.reset();
        if (r.error === 'invalid') setErrors(r.fieldErrors);
        else setFormError(t(`errors.${r.error}`));
      } catch {
        turnstile.current?.reset();
        setFormError(t('errors.failed'));
      }
    });
  };

  return (
    <>
      {showButton && (
        <button
          type="button"
          data-testid="free-delivery-button"
          onClick={() => onOpenChange(true)}
          className="fixed bottom-4 start-4 z-30 flex items-center gap-2 rounded-full bg-blue px-4 py-3 text-sm font-extrabold text-white shadow-[0_12px_30px_-10px_rgba(6,147,230,0.7)] transition hover:bg-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue/30 [body[data-sticky-atc=on]_&]:bottom-24"
        >
          <Truck className="size-5" aria-hidden />
          {t('button')}
        </button>
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          {done ? (
            <div data-testid="free-delivery-done" className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-ice text-blue">
                <CircleCheck className="size-8" aria-hidden />
              </span>
              <DialogTitle className="text-xl font-extrabold text-navy">{t('successTitle')}</DialogTitle>
              <DialogDescription className="text-muted-ink">{t('successBody')}</DialogDescription>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="mt-2 h-12 w-full rounded-full bg-navy font-extrabold text-white transition hover:bg-navy-700"
              >
                {t('done')}
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              <DialogHeader className="items-start text-start">
                <span className="flex size-11 items-center justify-center rounded-full bg-ice text-blue">
                  <Truck className="size-6" aria-hidden />
                </span>
                <DialogTitle className="text-xl font-extrabold text-navy">{t('title')}</DialogTitle>
                <DialogDescription className="text-muted-ink">{t('subtitle')}</DialogDescription>
              </DialogHeader>

              <Field id="fd-name" label={t('name')} error={err('name')}>
                <input
                  id="fd-name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => set('name')(e.target.value)}
                  className={inputClass}
                  {...describe('fd-name', err('name'))}
                />
              </Field>
              <Field id="fd-email" label={t('email')} error={err('email')}>
                <input
                  id="fd-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  dir="ltr"
                  value={form.email}
                  onChange={(e) => set('email')(e.target.value)}
                  className={inputClass}
                  {...describe('fd-email', err('email'))}
                />
              </Field>
              <Field id="fd-phone" label={t('phone')} hint={t('phoneHint')} error={err('phone')}>
                <input
                  id="fd-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => set('phone')(e.target.value)}
                  className={inputClass}
                  {...describe('fd-phone', err('phone'), t('phoneHint'))}
                />
              </Field>

              <label className="flex items-start gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.marketingOptIn}
                  onChange={(e) => setForm((f) => ({ ...f, marketingOptIn: e.target.checked }))}
                  className="mt-0.5 size-5 shrink-0 accent-blue"
                />
                <span>{t('optIn')}</span>
              </label>
              <p className="text-xs text-muted-ink">
                {t('privacy')}{' '}
                <Link href="/policies/privacy" className="font-semibold text-blue underline">
                  {t('privacyLink')}
                </Link>
              </p>

              <Turnstile ref={turnstile} siteKey={siteKey} locale={locale} onToken={setToken} onExpire={() => setToken('')} />
              {formError && (
                <p role="alert" className="text-sm font-medium text-red-600">
                  {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={pending || !token}
                className="h-12 w-full rounded-full bg-navy font-extrabold tracking-wide text-white transition hover:bg-navy-700 disabled:opacity-60"
              >
                {pending ? t('submitting') : !token ? t('verifying') : t('submit')}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
