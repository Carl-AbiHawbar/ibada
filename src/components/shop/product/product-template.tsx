import { draftMode } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { LogoMark } from '@/components/brand/logo';
import { SAMPLE_REVIEWS, sampleReviewSummary } from '@/content/sample-reviews';
import type { Locale } from '@/i18n/routing';
import type { ProductView } from '@/server/catalog';
import type { ReviewSummary, ReviewView } from '@/server/reviews';
import { jsonLdScript, productJsonLd } from '@/server/seo';
import type { StoreSettings } from '@/server/settings';
import { Benefits } from './benefits';
import { BundlePicker } from './bundle-picker';
import { Comparison } from './comparison';
import { Faq } from './faq';
import { Gallery } from './gallery';
import { Pests } from './pests';
import { PriceBlock } from './price-block';
import { PurchasePanel } from './purchase-panel';
import { RatingSummary } from './rating-summary';
import { ReviewsSection } from './reviews-section';
import { ProductSelectionProvider } from './selection-context';
import { Steps } from './steps';
import { StickyBar } from './sticky-bar';
import { TrustStrip } from './trust-strip';

export async function ProductTemplate({
  locale,
  product,
  settings,
  summary,
  reviews,
  url,
}: {
  locale: Locale;
  product: ProductView;
  settings: StoreSettings;
  summary: ReviewSummary;
  reviews: ReviewView[];
  url: string;
}) {
  const t = await getTranslations({ locale, namespace: 'hero' });
  const tc = await getTranslations({ locale, namespace: 'cta' });
  const singleImage = product.bundles.find((b) => b.units === 1)?.imageUrl ?? product.images[0]?.url ?? null;
  const ld = productJsonLd(product, { locale, url, rating: summary });
  // Private preview (Draft Mode): sample reviews stand in until real ones exist. Search data keeps real ones only.
  const showSamples = (await draftMode()).isEnabled && summary.count === 0;
  const shownSummary = showSamples ? sampleReviewSummary() : summary;
  const shownReviews = showSamples ? SAMPLE_REVIEWS : reviews;

  return (
    <ProductSelectionProvider product={product}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />

      <section className="relative overflow-x-clip bg-[radial-gradient(90%_60%_at_50%_0%,var(--color-ice)_0%,#ffffff_70%)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-12">
          <Gallery header={<RatingSummary locale={locale} summary={shownSummary} trustpilotUrl={settings.trustpilotUrl} sample={showSamples} />} />
          <div id="buy" className="scroll-mt-24">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-navy/70">
              <LogoMark className="h-3.5" /> {product.name[locale]}
            </p>
            <h1 className="mt-3 bg-linear-to-r from-navy via-navy-700 to-blue bg-clip-text pb-1 text-4xl font-extrabold leading-[1.05] tracking-tight text-transparent sm:text-5xl lg:text-6xl">
              {t('headline')}
            </h1>
            <p className="mt-3 text-lg font-medium text-navy">{product.tagline[locale]}</p>
            <PriceBlock />
            <Benefits locale={locale} />
            <BundlePicker />
            <PurchasePanel deliveryTime={settings.deliveryTime[locale]} />
            <TrustStrip locale={locale} freeDelivery={settings.deliveryFeeCents === 0} />
          </div>
        </div>
      </section>

      <Steps locale={locale} />
      <Pests locale={locale} />
      <Comparison locale={locale} imageUrl={singleImage} />
      <ReviewsSection locale={locale} productId={product.id} summary={shownSummary} reviews={shownReviews} />
      <Faq locale={locale} />

      <section className="bg-navy py-16 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{tc('title')}</h2>
          <p className="text-white/70">{tc('subtitle')}</p>
          <a
            href="#buy"
            className="inline-flex h-12 items-center rounded-full bg-white px-8 font-extrabold text-navy transition hover:bg-ice"
          >
            {tc('button')}
          </a>
        </div>
      </section>

      <StickyBar />
    </ProductSelectionProvider>
  );
}
