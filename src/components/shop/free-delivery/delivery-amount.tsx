'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatUsd } from '@/lib/money';
import { useFreeDelivery } from './free-delivery-provider';

/**
 * The delivery cell of a cart or order summary: "Get it free → $4" while a fee applies,
 * "~~$4~~ FREE" once the shopper claimed the offer, and "FREE" when delivery is free anyway.
 * `testId` marks the amount; its link is `${testId}-get-free`.
 */
export function DeliveryAmount({
  deliveryCents,
  claimed,
  testId,
  onBeforeOpen,
}: {
  deliveryCents: number;
  claimed: boolean;
  testId: string;
  onBeforeOpen?: () => void;
}) {
  const tc = useTranslations('common');
  const tf = useTranslations('freeDelivery');
  const { feeCents, openForm } = useFreeDelivery();

  if (deliveryCents > 0) {
    return (
      <span className="flex items-center gap-2">
        <button
          type="button"
          data-testid={`${testId}-get-free`}
          onClick={() => {
            onBeforeOpen?.();
            openForm();
          }}
          className="inline-flex items-center gap-1 text-sm font-bold text-blue underline underline-offset-2 hover:text-navy"
        >
          {tf('getItFree')}
          <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden />
        </button>
        <span data-testid={testId} className="font-semibold text-navy">
          {formatUsd(deliveryCents)}
        </span>
      </span>
    );
  }
  if (claimed && feeCents > 0) {
    return (
      <span className="flex items-center gap-2">
        <s className="text-muted-ink">{formatUsd(feeCents)}</s>
        <span data-testid={testId} className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-extrabold text-emerald-700">
          {tc('free')}
        </span>
      </span>
    );
  }
  return (
    <span data-testid={testId} className="font-semibold text-blue">
      {tc('free')}
    </span>
  );
}
