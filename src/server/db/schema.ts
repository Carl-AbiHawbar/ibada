import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { staffRole, user } from './auth-schema';

export * from './auth-schema';

// ---------- enums ----------
export const productStatus = pgEnum('product_status', ['active', 'draft']);
export const bundleBadge = pgEnum('bundle_badge', ['none', 'most_popular', 'best_value']);
export const orderStatus = pgEnum('order_status', [
  'new',
  'confirmed',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
]);
export const paymentStatus = pgEnum('payment_status', ['pending', 'paid']);
export const orderEventType = pgEnum('order_event_type', ['created', 'status_changed', 'note']);
export const movementReason = pgEnum('movement_reason', ['order', 'cancel', 'return', 'manual', 'initial']);
export const discountType = pgEnum('discount_type', ['percent', 'fixed']);
export const funnelEventType = pgEnum('funnel_event_type', [
  'view_product',
  'add_to_cart',
  'begin_checkout',
  'order_placed',
]);
export const locale = pgEnum('locale', ['en', 'ar']);

export const orderNumberSeq = pgSequence('order_number_seq', { startWith: 1001 });

// ---------- helpers ----------
const id = () => uuid('id').primaryKey().defaultRandom();
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const staffRef = (name: string) => text(name).references(() => user.id, { onDelete: 'set null' });

// ---------- catalog ----------
export const products = pgTable(
  'products',
  {
    id: id(),
    slug: text('slug').notNull().unique(),
    nameEn: text('name_en').notNull(),
    nameAr: text('name_ar').notNull(),
    taglineEn: text('tagline_en').notNull().default(''),
    taglineAr: text('tagline_ar').notNull().default(''),
    descriptionEn: text('description_en').notNull().default(''),
    descriptionAr: text('description_ar').notNull().default(''),
    status: productStatus('status').notNull().default('draft'),
    stockUnits: integer('stock_units').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(10),
    seoTitleEn: text('seo_title_en').notNull().default(''),
    seoTitleAr: text('seo_title_ar').notNull().default(''),
    seoDescriptionEn: text('seo_description_en').notNull().default(''),
    seoDescriptionAr: text('seo_description_ar').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check('products_stock_nonnegative', sql`${t.stockUnits} >= 0`)],
);

export const productImages = pgTable('product_images', {
  id: id(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  /** Arabic version of the image (text baked into lifestyle shots); null = same as `url`. */
  urlAr: text('url_ar'),
  altEn: text('alt_en').notNull().default(''),
  altAr: text('alt_ar').notNull().default(''),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const bundles = pgTable(
  'bundles',
  {
    id: id(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    nameEn: text('name_en').notNull(),
    nameAr: text('name_ar').notNull(),
    subtitleEn: text('subtitle_en').notNull().default(''),
    subtitleAr: text('subtitle_ar').notNull().default(''),
    units: integer('units').notNull(),
    priceCents: integer('price_cents').notNull(),
    compareAtCents: integer('compare_at_cents'),
    badge: bundleBadge('badge').notNull().default('none'),
    imageId: uuid('image_id').references(() => productImages.id, { onDelete: 'set null' }),
    isDefault: boolean('is_default').notNull().default(false),
    position: integer('position').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('bundles_units_positive', sql`${t.units} >= 1`),
    check('bundles_price_positive', sql`${t.priceCents} > 0`),
    check('bundles_compare_at_above_price', sql`${t.compareAtCents} IS NULL OR ${t.compareAtCents} > ${t.priceCents}`),
  ],
);

// ---------- customers & orders ----------
export const customers = pgTable('customers', {
  id: id(),
  phone: text('phone').notNull().unique(),
  name: text('name').notNull(),
  orderCount: integer('order_count').notNull().default(0),
  totalSpentCents: integer('total_spent_cents').notNull().default(0),
  lastOrderAt: timestamp('last_order_at', { withTimezone: true }),
  notes: text('notes').notNull().default(''),
  blocked: boolean('blocked').notNull().default(false),
  blockedReason: text('blocked_reason'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const orders = pgTable(
  'orders',
  {
    id: id(),
    number: integer('number')
      .notNull()
      .unique()
      .default(sql`nextval('order_number_seq')`),
    idempotencyKey: uuid('idempotency_key').notNull().unique(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    locale: locale('locale').notNull(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    governorate: text('governorate').notNull(),
    district: text('district').notNull(),
    town: text('town').notNull(),
    addressLine: text('address_line').notNull(),
    landmark: text('landmark').notNull().default(''),
    notes: text('notes').notNull().default(''),
    subtotalCents: integer('subtotal_cents').notNull(),
    discountCents: integer('discount_cents').notNull().default(0),
    deliveryCents: integer('delivery_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),
    discountCode: text('discount_code'),
    status: orderStatus('status').notNull().default('new'),
    paymentStatus: paymentStatus('payment_status').notNull().default('pending'),
    ipHash: text('ip_hash').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('orders_status_created_idx').on(t.status, t.createdAt),
    index('orders_phone_idx').on(t.phone),
    index('orders_created_idx').on(t.createdAt),
  ],
);

export const orderItems = pgTable('order_items', {
  id: id(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  bundleId: uuid('bundle_id').references(() => bundles.id, { onDelete: 'set null' }),
  productNameEn: text('product_name_en').notNull(),
  productNameAr: text('product_name_ar').notNull(),
  bundleNameEn: text('bundle_name_en').notNull(),
  bundleNameAr: text('bundle_name_ar').notNull(),
  unitsPerBundle: integer('units_per_bundle').notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  lineTotalCents: integer('line_total_cents').notNull(),
});

export const orderEvents = pgTable(
  'order_events',
  {
    id: id(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    type: orderEventType('type').notNull(),
    fromStatus: orderStatus('from_status'),
    toStatus: orderStatus('to_status'),
    note: text('note'),
    userId: staffRef('user_id'),
    createdAt: createdAt(),
  },
  (t) => [index('order_events_order_idx').on(t.orderId, t.createdAt)],
);

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: id(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    deltaUnits: integer('delta_units').notNull(),
    reason: movementReason('reason').notNull(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    userId: staffRef('user_id'),
    note: text('note').notNull().default(''),
    createdAt: createdAt(),
  },
  (t) => [index('inventory_movements_product_idx').on(t.productId, t.createdAt)],
);

// ---------- discounts ----------
export const discounts = pgTable(
  'discounts',
  {
    id: id(),
    code: text('code').notNull(),
    type: discountType('type').notNull(),
    value: integer('value').notNull(),
    minSubtotalCents: integer('min_subtotal_cents'),
    usageLimit: integer('usage_limit'),
    usedCount: integer('used_count').notNull().default(0),
    oncePerPhone: boolean('once_per_phone').notNull().default(false),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('discounts_code_upper_idx').on(sql`upper(${t.code})`)],
);

export const discountRedemptions = pgTable(
  'discount_redemptions',
  {
    id: id(),
    discountId: uuid('discount_id')
      .notNull()
      .references(() => discounts.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    // Snapshot of discounts.once_per_phone so the partial unique index can enforce it.
    oncePerPhone: boolean('once_per_phone').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('discount_redemptions_once_per_phone_idx')
      .on(t.discountId, t.phone)
      .where(sql`${t.oncePerPhone}`),
    index('discount_redemptions_order_idx').on(t.orderId),
  ],
);

// ---------- content ----------
export const reviews = pgTable(
  'reviews',
  {
    id: id(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    authorName: text('author_name').notNull(),
    rating: integer('rating').notNull(),
    body: text('body').notNull(),
    locale: locale('locale').notNull(),
    photoUrl: text('photo_url'),
    visible: boolean('visible').notNull().default(true),
    reviewDate: timestamp('review_date', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check('reviews_rating_range', sql`${t.rating} BETWEEN 1 AND 5`)],
);

export type SocialLinks = { instagram?: string; facebook?: string; tiktok?: string };

export const settings = pgTable(
  'settings',
  {
    id: id(),
    singleton: boolean('singleton').notNull().default(true).unique(),
    storeName: text('store_name').notNull().default('IBADA'),
    contactPhone: text('contact_phone'),
    contactEmail: text('contact_email'),
    social: jsonb('social').$type<SocialLinks>().notNull().default({}),
    announcementEn: text('announcement_en').notNull().default(''),
    announcementAr: text('announcement_ar').notNull().default(''),
    announcementEnabled: boolean('announcement_enabled').notNull().default(true),
    deliveryFeeCents: integer('delivery_fee_cents').notNull().default(0),
    freeDeliveryThresholdCents: integer('free_delivery_threshold_cents'),
    deliveryTimeEn: text('delivery_time_en').notNull().default(''),
    deliveryTimeAr: text('delivery_time_ar').notNull().default(''),
    trustpilotUrl: text('trustpilot_url'),
    updatedAt: updatedAt(),
  },
  (t) => [check('settings_singleton', sql`${t.singleton}`)],
);

// ---------- admin support ----------
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: id(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const events = pgTable(
  'events',
  {
    id: id(),
    type: funnelEventType('type').notNull(),
    sessionId: text('session_id').notNull(),
    locale: locale('locale').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('events_type_created_idx').on(t.type, t.createdAt)],
);

export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    userId: staffRef('user_id'),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    summary: text('summary').notNull(),
    ipHash: text('ip_hash'),
    createdAt: createdAt(),
  },
  (t) => [index('audit_log_created_idx').on(t.createdAt)],
);

export const staffInvites = pgTable('staff_invites', {
  id: id(),
  email: text('email').notNull(),
  role: staffRole('role').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  invitedBy: staffRef('invited_by'),
  createdAt: createdAt(),
});

/** Shoppers who filled in the free-delivery form (their browser then gets free delivery). */
export const deliverySignups = pgTable(
  'delivery_signups',
  {
    id: id(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    /** Consent to offers (sent on WhatsApp). */
    marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
    /** Pests the shopper usually deals with (keys from PEST_CHOICES). */
    pests: text('pests').array().notNull().default(sql`'{}'::text[]`),
    locale: text('locale').notNull().default('en'),
    ipHash: text('ip_hash'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('delivery_signups_created_idx').on(t.createdAt)],
);
