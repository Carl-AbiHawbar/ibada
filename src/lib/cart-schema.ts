import { z } from 'zod';

export type L10n = { en: string; ar: string };

export const MAX_CART_LINES = 10;
export const MAX_LINE_QUANTITY = 10;

export const cartLineSchema = z.object({
  bundleId: z.uuid(),
  quantity: z.int().min(1).max(MAX_LINE_QUANTITY),
});

export const cartSchema = z.array(cartLineSchema).min(1).max(MAX_CART_LINES);

export type CartLine = z.infer<typeof cartLineSchema>;
