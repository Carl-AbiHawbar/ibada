import { expect, test } from 'vitest';
import { SAMPLE_REVIEWS, sampleReviewSummary } from '@/content/sample-reviews';

test('preview samples average 4.8 over 10 reviews, all marked as samples', () => {
  expect(sampleReviewSummary()).toMatchObject({ count: 10, average: 4.8, distribution: { 5: 8, 4: 2 } });
  expect(SAMPLE_REVIEWS.every((r) => r.sample === true && r.id.startsWith('sample-'))).toBe(true);
});
