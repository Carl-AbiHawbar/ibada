const whole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const withCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/** `$36` for whole dollars, `$32.40` otherwise. Input is integer cents. */
export function formatUsd(cents: number): string {
  return cents % 100 === 0 ? whole.format(cents / 100) : withCents.format(cents / 100);
}

/** Whole-percent saving versus the compare-at price, or null when there is no saving. */
export function savePercent(priceCents: number, compareAtCents: number | null): number | null {
  if (compareAtCents === null || compareAtCents <= priceCents) return null;
  return Math.round((1 - priceCents / compareAtCents) * 100);
}

/** Price of one device inside a bundle, rounded to the cent. */
export function perUnitCents(priceCents: number, units: number): number {
  return Math.round(priceCents / units);
}
