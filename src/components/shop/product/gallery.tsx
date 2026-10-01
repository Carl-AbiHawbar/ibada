'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { ImageView } from '@/server/catalog';
import { useSelectedBundle } from './selection-context';

type Slide = { id: string; url: string; alt: string; pack: boolean };

/** `header` renders above the photo (the rating badge). */
export function Gallery({ header }: { header?: ReactNode }) {
  const t = useTranslations('hero');
  const tb = useTranslations('bundles');
  const locale = useLocale() as 'en' | 'ar';
  const { product, bundle } = useSelectedBundle();
  const [emblaRef, embla] = useEmblaCarousel({ direction: locale === 'ar' ? 'rtl' : 'ltr', loop: false });
  const [index, setIndex] = useState(0);
  const strip = useRef<HTMLDivElement>(null);

  // The selected pack's photo leads (it is the only slide that follows the pack picker); the rest
  // are photos that are not pack shots, in the visitor's language when an Arabic version exists.
  const slides = useMemo<Slide[]>(() => {
    const packShots = new Set(product.bundles.map((b) => b.imageUrl).filter(Boolean));
    const main = product.images.find((img) => img.url === bundle.imageUrl) ?? product.images[0];
    const extras = product.images.filter((img) => !packShots.has(img.url) && img.id !== main?.id);
    const view = (img: ImageView, pack: boolean): Slide => ({
      id: img.id,
      url: (locale === 'ar' && img.urlAr) || img.url,
      alt: img.alt[locale],
      pack,
    });
    return [...(main ? [view(main, true)] : []), ...extras.map((img) => view(img, false))];
  }, [product.images, product.bundles, bundle.imageUrl, locale]);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setIndex(embla.selectedScrollSnap());
    embla.on('select', onSelect);
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla]);

  // Picking a pack brings its photo (the first slide) into view.
  useEffect(() => {
    embla?.scrollTo(0);
  }, [embla, bundle.imageUrl]);

  // Keep the selected thumbnail visible in the strip.
  useEffect(() => {
    const thumb = strip.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`);
    thumb?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [index]);

  const go = useCallback((i: number) => embla?.scrollTo(i), [embla]);
  const Prev = locale === 'ar' ? ChevronRight : ChevronLeft;
  const Next = locale === 'ar' ? ChevronLeft : ChevronRight;
  const arrow =
    'flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-navy shadow-md ring-1 ring-line transition hover:bg-ice disabled:opacity-30';

  return (
    <div data-testid="gallery" className="min-w-0">
      {header}
      <div className="relative overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_24px_60px_-30px_rgba(1,39,85,0.35)]">
        {slides[index]?.pack && bundle.savePercent !== null && (
          <span className="absolute start-4 top-4 z-10 rounded-full bg-blue px-3 py-1 text-sm font-bold text-white shadow-md">
            {tb('save', { percent: bundle.savePercent })}
          </span>
        )}
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {slides.map((s, i) => (
              <div key={s.id} className="relative aspect-square min-w-0 flex-[0_0_100%]">
                <Image
                  src={s.url}
                  alt={s.alt}
                  fill
                  priority={i === 0}
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className={s.pack ? 'object-contain p-6 sm:p-10' : 'object-cover'}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={() => embla?.scrollPrev()} disabled={index === 0} aria-label={t('previousImage')} className={arrow}>
            <Prev className="size-5" />
          </button>
          <div ref={strip} className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] sm:gap-3">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                data-thumb={i}
                onClick={() => go(i)}
                aria-label={t('showImage', { n: i + 1 })}
                aria-current={i === index}
                className={cn(
                  'relative aspect-square w-[calc((100%-1.5rem)/4)] shrink-0 overflow-hidden rounded-2xl border-2 bg-white transition sm:w-[calc((100%-2.25rem)/4)]',
                  i === index ? 'border-navy' : 'border-line hover:border-navy/40',
                )}
              >
                <Image src={s.url} alt="" fill sizes="120px" className={s.pack ? 'object-contain p-1.5' : 'object-cover'} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => embla?.scrollNext()}
            disabled={index === slides.length - 1}
            aria-label={t('nextImage')}
            className={arrow}
          >
            <Next className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
