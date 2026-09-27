'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSelectedBundle } from './selection-context';

export function Gallery() {
  const t = useTranslations('hero');
  const tb = useTranslations('bundles');
  const locale = useLocale() as 'en' | 'ar';
  const { product, bundle } = useSelectedBundle();
  const [emblaRef, embla] = useEmblaCarousel({ direction: locale === 'ar' ? 'rtl' : 'ltr', loop: false });
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setIndex(embla.selectedScrollSnap());
    embla.on('select', onSelect);
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla]);

  // Picking a bundle shows that bundle's photo.
  useEffect(() => {
    const i = product.images.findIndex((img) => img.url === bundle.imageUrl);
    if (embla && i >= 0) embla.scrollTo(i);
  }, [embla, bundle.imageUrl, product.images]);

  const go = useCallback((i: number) => embla?.scrollTo(i), [embla]);
  const Prev = locale === 'ar' ? ChevronRight : ChevronLeft;
  const Next = locale === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <div className="relative overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_24px_60px_-30px_rgba(1,39,85,0.35)]">
        {bundle.savePercent !== null && (
          <span className="absolute start-4 top-4 z-10 rounded-full bg-blue px-3 py-1 text-sm font-bold text-white shadow-md">
            {tb('save', { percent: bundle.savePercent })}
          </span>
        )}
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {product.images.map((img, i) => (
              <div key={img.id} className="relative aspect-square min-w-0 flex-[0_0_100%]">
                <Image
                  src={img.url}
                  alt={img.alt[locale]}
                  fill
                  priority={i === 0}
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-contain p-6 sm:p-10"
                />
              </div>
            ))}
          </div>
        </div>
        {product.images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => embla?.scrollPrev()}
              disabled={index === 0}
              aria-label={t('previousImage')}
              className="absolute start-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow-md transition hover:bg-white disabled:opacity-0 md:flex"
            >
              <Prev className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => embla?.scrollNext()}
              disabled={index === product.images.length - 1}
              aria-label={t('nextImage')}
              className="absolute end-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow-md transition hover:bg-white disabled:opacity-0 md:flex"
            >
              <Next className="size-5" />
            </button>
          </>
        )}
      </div>

      {product.images.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
          {product.images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => go(i)}
              aria-label={t('showImage', { n: i + 1 })}
              aria-current={i === index}
              className={cn(
                'relative aspect-square overflow-hidden rounded-2xl border-2 bg-white transition',
                i === index ? 'border-navy' : 'border-line hover:border-navy/40',
              )}
            >
              <Image src={img.url} alt="" fill sizes="120px" className="object-contain p-1.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
