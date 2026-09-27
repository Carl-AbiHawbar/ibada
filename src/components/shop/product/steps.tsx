import Image from 'next/image';
import { PlugZap, Sofa, Volume2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';

export async function Steps({ locale, imageUrl }: { locale: Locale; imageUrl: string | null }) {
  const t = await getTranslations({ locale, namespace: 'steps' });
  const steps = [
    { n: 1, Icon: PlugZap, title: t('step1Title'), body: t('step1') },
    { n: 2, Icon: Sofa, title: t('step2Title'), body: t('step2') },
  ];
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-ice py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-blue">{t('eyebrow')}</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{t('title')}</h2>
          <p className="mt-3 text-lg text-muted-ink">{t('subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {steps.map(({ n, Icon, title, body }) => (
            <article key={n} className="relative overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0_20px_50px_-30px_rgba(1,39,85,0.4)]">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-navy px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  {t('step', { n })}
                </span>
                <span className="flex size-14 items-center justify-center rounded-2xl bg-blue/10 text-blue">
                  <Icon className="size-7" aria-hidden />
                </span>
              </div>
              <h3 className="mt-6 text-2xl font-extrabold text-navy">{title}</h3>
              <p className="mt-2 max-w-sm text-lg text-ink/80">{body}</p>
              {n === 1 && imageUrl && (
                <div className="relative mt-6 h-40">
                  <Image src={imageUrl} alt="" fill sizes="(min-width: 768px) 40vw, 90vw" className="object-contain" />
                </div>
              )}
              {n === 2 && (
                <div className="mt-6 flex h-40 items-center justify-center rounded-3xl bg-linear-to-br from-ice to-ice-2">
                  <span className="relative flex size-20 items-center justify-center rounded-full bg-white shadow-inner">
                    <span className="absolute inset-0 animate-ping rounded-full bg-blue/20 motion-reduce:animate-none" />
                    <span className="size-4 rounded-full bg-blue" />
                  </span>
                </div>
              )}
            </article>
          ))}
        </div>

        <p className="mx-auto mt-10 flex max-w-2xl items-start gap-3 text-center text-muted-ink sm:items-center">
          <Volume2 className="mt-0.5 size-5 shrink-0 text-blue sm:mt-0" aria-hidden />
          <span>{t('science')}</span>
        </p>
      </div>
    </section>
  );
}
