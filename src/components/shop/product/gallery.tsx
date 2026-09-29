'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSelectedBundle } from './selection-context';

/** `header` renders above the photo (the rating badge), inside the sticky column. */
export function Gallery({ header }: { header?: ReactNode }) {
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

  // The selected pack's photo leads; the rest of the gallery is photos that aren't a pack shot
  // (lifestyle and detail images). Pack shots only appear in the pack picker.
  const slides = useMemo(() => {
    const packShots = new Set(product.bundles.map((b) => b.imageUrl).filter(Boolean));
    const main = product.images.find((img) => img.url === bundle.imageUrl) ?? product.images[0];
    const extras = product.images.filter((img) => !packShots.has(img.url) && img.id !== main?.id);
    return main ? [main, ...extras] : extras;
  }, [product.images, product.bundles, bundle.imageUrl]);

  // Picking a pack brings its photo (now the first slide) into view.
  useEffect(() => {
    embla?.scrollTo(0);
  }, [embla, bundle.imageUrl]);

  const go = useCallback((i: number) => embla?.scrollTo(i), [embla]);
  const Prev = locale === 'ar' ? ChevronRight : ChevronLeft;
  const Next = locale === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <div data-testid="gallery" className="lg:sticky lg:top-24 lg:self-start">
      {header}
      <div className="relative overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_24px_60px_-30px_rgba(1,39,85,0.35)]">
        {bundle.savePercent !== null && (
          <span className="absolute start-4 top-4 z-10 rounded-full bg-blue px-3 py-1 text-sm font-bold text-white shadow-md">
            {tb('save', { percent: bundle.savePercent })}
          </span>
        )}
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {slides.map((img, i) => (
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
        {slides.length > 1 && (
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
              disabled={index === slides.length - 1}
              aria-label={t('nextImage')}
              className="absolute end-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-navy shadow-md transition hover:bg-white disabled:opacity-0 md:flex"
            >
              <Next className="size-5" />
            </button>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
          {slides.map((img, i) => (
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
