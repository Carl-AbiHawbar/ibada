// Sample reviews for the private preview only (Draft Mode). Never shown to shoppers:
// they exist so the owner can see how the reviews section and rating badge will look.
import type { ReviewSummary, ReviewView } from '@/server/reviews';

const sample = (n: number, r: Omit<ReviewView, 'id' | 'photoUrl' | 'sample'>): ReviewView => ({
  id: `sample-${n}`,
  photoUrl: null,
  sample: true,
  ...r,
});

export const SAMPLE_REVIEWS: ReviewView[] = [
  sample(1, { authorName: 'Rania K.', rating: 5, locale: 'en', reviewDate: '2026-09-21', body: 'Plugged one in the kitchen and haven’t seen a cockroach since. Silent and no smell at all.' }),
  sample(2, { authorName: 'جورج م.', rating: 5, locale: 'ar', reviewDate: '2026-09-18', body: 'جهاز ممتاز، وضعته في غرفة النوم ولم نعد نرى البعوض. التوصيل كان سريعًا.' }),
  sample(3, { authorName: 'Maya H.', rating: 5, locale: 'en', reviewDate: '2026-09-15', body: 'Safe with my kids and our cat, which was the main reason I chose it. Works as described.' }),
  sample(4, { authorName: 'Karim S.', rating: 4, locale: 'en', reviewDate: '2026-09-12', body: 'Took about a week to notice a difference, but the ants in the balcony are gone now.' }),
  sample(5, { authorName: 'لينا ح.', rating: 5, locale: 'ar', reviewDate: '2026-09-09', body: 'اشتريت باقة العائلة للبيت كله. لا روائح ولا مواد كيميائية، أنصح به.' }),
  sample(6, { authorName: 'Tony A.', rating: 5, locale: 'en', reviewDate: '2026-09-05', body: 'Cash on delivery made it easy to try. Ordering another one for my parents.' }),
  sample(7, { authorName: 'Nour B.', rating: 4, locale: 'en', reviewDate: '2026-09-01', body: 'Good value in the 4-pack. The light is a bit bright at night in the bedroom.' }),
  sample(8, { authorName: 'سامي د.', rating: 5, locale: 'ar', reviewDate: '2026-08-28', body: 'فرق واضح بعد أسبوعين تقريبًا. خدمة الزبائن اتصلت لتأكيد الطلب بسرعة.' }),
  sample(9, { authorName: 'Joelle R.', rating: 5, locale: 'en', reviewDate: '2026-08-24', body: 'No more sprays in the house. Exactly what I was looking for.' }),
  sample(10, { authorName: 'Hadi F.', rating: 5, locale: 'en', reviewDate: '2026-08-20', body: 'Small, quiet and it just works. Great for our shop storage room.' }),
];

export function sampleReviewSummary(): ReviewSummary {
  const distribution: ReviewSummary['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of SAMPLE_REVIEWS) distribution[r.rating as 1 | 2 | 3 | 4 | 5] += 1;
  const sum = SAMPLE_REVIEWS.reduce((s, r) => s + r.rating, 0);
  return { count: SAMPLE_REVIEWS.length, average: Math.round((sum / SAMPLE_REVIEWS.length) * 10) / 10, distribution };
}
