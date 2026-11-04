import type { Db } from './client';
import { settings } from './schema';

/** Insert the single settings row with launch defaults if it does not exist yet. */
export async function seedSettings(db: Db): Promise<void> {
  await db
    .insert(settings)
    .values({
      storeName: 'IBADA',
      announcementEn: 'Free delivery when you sign up · Cash on delivery · 30-day money-back guarantee',
      announcementAr: 'توصيل مجاني عند التسجيل · الدفع عند الاستلام · ضمان استرداد المال لمدة 30 يومًا',
      announcementEnabled: true,
      deliveryFeeCents: 400,
      deliveryTimeEn: 'Orders are typically delivered in 2–4 business days',
      deliveryTimeAr: 'يتم توصيل الطلبات عادةً خلال 2–4 أيام عمل',
    })
    .onConflictDoNothing({ target: settings.singleton });
}
