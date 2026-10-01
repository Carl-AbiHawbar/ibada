import Image from 'next/image';
import { CircleCheck, CircleX } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LogoMark } from '@/components/brand/logo';
import type { Locale } from '@/i18n/routing';
import { MosquitoLanding } from './mosquito-landing';

const ROWS = ['r1', 'r2', 'r3', 'r4'] as const;

export async function Comparison({ locale, imageUrl }: { locale: Locale; imageUrl: string | null }) {
  const t = await getTranslations({ locale, namespace: 'comparison' });
  return (
    <section className="bg-linear-to-b from-white to-ice py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center">
          <MosquitoLanding>
            <p className="inline-block rounded-full bg-blue px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
              {t('eyebrow')}
            </p>
          </MosquitoLanding>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{t('title')}</h2>
        </div>

        <div className="mt-10 grid grid-cols-2 overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_24px_60px_-35px_rgba(1,39,85,0.45)]">
          <div className="flex flex-col items-center gap-3 bg-navy px-4 py-6 text-white">
            {imageUrl ? (
              <span className="relative size-20 overflow-hidden rounded-2xl bg-white">
                <Image src={imageUrl} alt="" fill sizes="80px" className="object-contain p-1.5" />
              </span>
            ) : (
              <LogoMark tone="light" className="h-10" />
            )}
            <span className="text-lg font-extrabold tracking-wide">{t('ibada')}</span>
          </div>
          <div data-testid="comparison-others" className="relative flex min-h-40 items-end justify-center overflow-hidden px-4 py-5 text-white">
            <Image src="/images/comparison/sprays-poisons.webp" alt="" fill sizes="(min-width: 896px) 448px, 50vw" className="object-cover" />
            <span className="absolute inset-0 bg-linear-to-t from-black/70 via-black/25 to-black/10" aria-hidden />
            <span className="relative text-lg font-bold drop-shadow-md">{t('others')}</span>
          </div>

          {ROWS.map((r) => (
            <div key={r} className="contents">
              <div className="flex items-start gap-2.5 border-t border-line px-4 py-4 sm:px-6">
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-blue" aria-hidden />
                <span className="text-sm font-semibold text-navy sm:text-base">{t(`rows.${r}.ibada`)}</span>
              </div>
              <div className="flex items-start gap-2.5 border-t border-s border-line bg-slate-50 px-4 py-4 sm:px-6">
                <CircleX className="mt-0.5 size-5 shrink-0 text-red-500" aria-hidden />
                <span className="text-sm text-slate-600 sm:text-base">{t(`rows.${r}.others`)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
