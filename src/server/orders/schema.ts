import { z } from 'zod';
import { cartSchema } from '@/lib/cart-schema';
import { GOVERNORATE_IDS, isValidDistrict } from '@/lib/lebanon';
import { normalizeLebanesePhone } from '@/lib/phone';

/** Checkout payload. Field error messages are i18n keys under `errors.*`. */
export const placeOrderSchema = z
  .object({
    idempotencyKey: z.uuid(),
    locale: z.enum(['en', 'ar']),
    cart: cartSchema,
    name: z.string().trim().min(2, 'invalid_name').max(80, 'invalid_name'),
    phone: z
      .string()
      .max(40, 'invalid_phone')
      .transform((v, ctx) => {
        const e164 = normalizeLebanesePhone(v);
        if (!e164) {
          ctx.addIssue({ code: 'custom', message: 'invalid_phone' });
          return z.NEVER;
        }
        return e164;
      }),
    governorate: z.enum(GOVERNORATE_IDS, { error: 'invalid_governorate' }),
    district: z.string().trim().max(40, 'invalid_district'),
    town: z.string().trim().min(2, 'invalid_town').max(60, 'invalid_town'),
    addressLine: z.string().trim().min(5, 'invalid_address').max(200, 'invalid_address'),
    landmark: z.string().trim().max(120, 'invalid_landmark').default(''),
    notes: z.string().trim().max(300, 'invalid_notes').default(''),
    discountCode: z.string().trim().max(32, 'invalid_discount').default(''),
    turnstileToken: z.string().max(4096),
  })
  .superRefine((v, ctx) => {
    if (!isValidDistrict(v.governorate, v.district)) {
      ctx.addIssue({ code: 'custom', path: ['district'], message: 'invalid_district' });
    }
  });

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

/** First error per top-level field, e.g. `{ phone: 'invalid_phone' }`. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form');
    out[field] ??= field === 'cart' ? 'invalid_cart' : issue.message;
  }
  return out;
}
