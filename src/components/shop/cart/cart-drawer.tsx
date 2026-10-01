'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, ShoppingBag, Trash2, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { quoteCartAction, type CartQuoteResult } from '@/app/[locale]/(shop)/actions';
import { DeliveryAmount } from '../free-delivery/delivery-amount';
import { useFreeDelivery } from '../free-delivery/free-delivery-provider';
import { QuantityStepper } from '@/components/shop/product/purchase-panel';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Link } from '@/i18n/navigation';
import { formatUsd } from '@/lib/money';
import { useCart } from './cart-provider';

export function CartDrawer() {
  const t = useTranslations('cart');
  const tc = useTranslations('common');
  const locale = useLocale() as 'en' | 'ar';
  const { open, setOpen, lines, setQuantity, remove, replace } = useCart();
  const { version: freeDeliveryVersion } = useFreeDelivery();
  const [quote, setQuote] = useState<CartQuoteResult | null>(null);
  const [notice, setNotice] = useState(false);
  const request = useRef(0);

  // Re-price from the server whenever the drawer is open and the cart changes.
  useEffect(() => {
    if (!open) return;
    const id = ++request.current;
    const timer = setTimeout(async () => {
      const q = await quoteCartAction(lines);
      if (id !== request.current) return;
      if (q.removed.length > 0) {
        setNotice(true);
        replace(q.lines.map((l) => ({ bundleId: l.bundleId, quantity: l.quantity })));
      }
      setQuote(q);
    }, 120);
    return () => clearTimeout(timer);
  }, [open, lines, replace, freeDeliveryVersion]);

  const qty = new Map(lines.map((l) => [l.bundleId, l.quantity]));
  const shown = (quote?.lines ?? []).filter((l) => qty.has(l.bundleId));
  const subtotal = shown.reduce((sum, l) => sum + l.unitPriceCents * (qty.get(l.bundleId) ?? l.quantity), 0);
  const loading = lines.length > 0 && !quote;
  const upgrade = quote?.upgrade ?? null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side={locale === 'ar' ? 'left' : 'right'}
        showCloseButton={false}
        className="w-full gap-0 bg-white p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <SheetTitle className="text-lg font-extrabold text-navy">{t('title')}</SheetTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('close')}
            className="flex size-9 items-center justify-center rounded-full text-navy hover:bg-ice"
          >
            <X className="size-5" />
          </button>
        </div>

        {notice && (
          <p role="status" className="mx-5 mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {t('itemsRemoved')}
          </p>
        )}

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-ice text-navy">
              <ShoppingBag className="size-7" aria-hidden />
            </span>
            <p className="text-lg font-bold text-navy">{t('empty')}</p>
            <p className="text-sm text-muted-ink">{t('emptyHint')}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 h-11 rounded-full border-2 border-navy px-6 text-sm font-bold text-navy hover:bg-navy hover:text-white"
            >
              {t('continue')}
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-busy={loading}>
              {loading && <li className="h-24 animate-pulse rounded-2xl bg-ice" aria-label={tc('loading')} />}
              {shown.map((l) => {
                const q = qty.get(l.bundleId) ?? l.quantity;
                return (
                  <li key={l.bundleId} className="flex gap-3 rounded-2xl border border-line p-3">
                    <span className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-line bg-white">
                      {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="80px" className="object-contain p-1.5" />}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold leading-tight text-navy">{l.bundleName[locale]}</p>
                          <p className="text-sm text-muted-ink">{l.productName[locale]}</p>
                        </div>
                        <span className="shrink-0 text-end leading-tight">
                          <span className="block font-extrabold text-navy">{formatUsd(l.unitPriceCents * q)}</span>
                          {l.compareAtCents !== null && l.compareAtCents > l.unitPriceCents && (
                            <s className="block text-xs text-muted-ink">{formatUsd(l.compareAtCents * q)}</s>
                          )}
                        </span>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <QuantityStepper size="sm" value={q} onChange={(n) => setQuantity(l.bundleId, n)} />
                        <button
                          type="button"
                          onClick={() => remove(l.bundleId)}
                          aria-label={t('remove')}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-ink hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
              {upgrade && qty.get(upgrade.fromBundleId) === 1 && (
                <li data-testid="cart-upgrade" className="rounded-2xl border border-blue/20 bg-ice p-4">
                  <div className="flex gap-3">
                    {upgrade.imageUrl && (
                      <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-white">
                        <Image src={upgrade.imageUrl} alt="" fill sizes="56px" className="object-contain p-1" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold uppercase tracking-widest text-blue">{t('upgradeEyebrow')}</p>
                      <p className="font-extrabold leading-tight text-navy">{t('upgradeTitle', { name: upgrade.toName[locale] })}</p>
                      <p className="mt-1 text-sm text-muted-ink">
                        {t('upgradeBody', {
                          from: upgrade.fromName[locale],
                          units: upgrade.toUnits,
                          extra: formatUsd(upgrade.extraCents),
                          perUnit: formatUsd(upgrade.toPerUnitCents),
                          fromPerUnit: formatUsd(upgrade.fromPerUnitCents),
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      replace(
                        lines.map((l) =>
                          l.bundleId === upgrade.fromBundleId ? { bundleId: upgrade.toBundleId, quantity: l.quantity } : l,
                        ),
                      )
                    }
                    className="mt-3 h-11 w-full rounded-full border-2 border-navy bg-white text-sm font-extrabold text-navy transition hover:bg-navy hover:text-white"
                  >
                    {t('upgradeCta', { extra: formatUsd(upgrade.extraCents) })}
                  </button>
                </li>
              )}
            </ul>

            <div className="space-y-3 border-t border-line bg-ice/60 px-5 py-5">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-ink">{t('subtotal')}</dt>
                  <dd data-testid="cart-subtotal" className="font-semibold text-navy">
                    {formatUsd(subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-ink">{t('delivery')}</dt>
                  <dd>
                    <DeliveryAmount
                      deliveryCents={quote?.deliveryCents ?? 0}
                      claimed={!!quote?.freeDelivery}
                      testId="cart-delivery"
                      onBeforeOpen={() => setOpen(false)}
                    />
                  </dd>
                </div>
                <div className="flex justify-between border-t border-line pt-2 text-base">
                  <dt className="font-bold text-navy">{t('total')}</dt>
                  <dd data-testid="cart-total" className="font-extrabold text-navy">
                    {formatUsd(subtotal + (quote?.deliveryCents ?? 0))}
                  </dd>
                </div>
              </dl>
              <p className="text-center text-xs font-medium text-navy/80">{t('codNote')}</p>
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className="flex h-12 w-full items-center justify-center rounded-full bg-navy font-extrabold tracking-wide text-white transition hover:bg-navy-700"
              >
                {t('checkout')}
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
