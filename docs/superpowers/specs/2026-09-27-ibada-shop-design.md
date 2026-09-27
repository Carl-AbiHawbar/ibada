# IBADA Shop: Design Spec

- **Date:** 2026-09-27
- **Status:** Approved in conversation, section by section; awaiting final review of this document
- **Domain:** ibadashop.com

## 1. Goal

A fast, secure, bilingual (English + Arabic) online shop for **IBADA ONE**, an ultrasonic pest repeller, sold in Lebanon for cash on delivery. It comes with a Shopify-style admin dashboard that the owner installs on their phone to get push notifications for new orders.

### Success criteria

1. A shopper on a phone can pick a bundle and place a cash-on-delivery order in English or Arabic (RTL) in under a minute.
2. Every admin device that enabled notifications gets a push notification within seconds of an order being placed.
3. The owner can manage orders, products/bundles, stock, customers, discount codes, reviews, settings and staff from the admin, on desktop or phone.
4. The product page scores 90+ on Lighthouse mobile performance and loads in under 1.5 s on 4G.
5. Prices, discounts and stock are enforced on the server only. No client input can change what an order costs.
6. All unit, integration and end-to-end tests pass.

### Decisions made with the owner

| Topic | Decision |
|---|---|
| Payment | Cash on delivery only. No card processing. |
| Market | Lebanon only, prices in USD |
| Languages | Storefront in English + Arabic (RTL); admin in English only |
| Customer accounts | None. Guest checkout, with order tracking by order number + phone. |
| Order notifications | Dashboard + Web Push to the installed admin PWA. No email, SMS or WhatsApp integration. |
| Delivery fee | Free for now. Configurable in admin (fee + free-delivery threshold). |
| Approach | Custom Next.js app: storefront and admin in one codebase |
| Trustpilot | No Trustpilot badge unless the owner provides a real Trustpilot profile. The rating shown comes from real reviews entered in the admin. |

## 2. Brand and source assets

Source: the owner's Google Drive folder `1BlWYiNJFghqLLZAqqtt-wz_aDrjXBfev`.

- **Colors** (sampled from the logo files):
  - Navy `#012755`: headings, primary buttons, text accents
  - IBADA Blue `#0693E6`: highlights, sale prices, links, focus rings
  - Derived tints: ice-blue backgrounds (`#EEF6FD`, `#DCEEFB`), a navy→blue gradient for the "PEST FREE LIVING" headline, and neutral greys for body text
- **Logo:**
  - `IBADA LOGO ICON.png` (transparent background) is used for the favicon and PWA icons.
  - The wordmark is recreated as an inline SVG (letters I B A D A, with the A's drawn as the roof mark with a dot) so it stays crisp and costs no extra request. If the recreation doesn't match closely enough, the PNG is used as a fallback.
- **Product images:** `IBADA_ONE_SINGLE/DOUBLE/TRIPLE/FULL.png`, one per bundle.
- **Fonts:** Plus Jakarta Sans (Latin) and IBM Plex Sans Arabic (Arabic), self-hosted via `next/font`.
- **Copy sources:** the concept deck (`IBADA website design concept.pptx`) and the packaging (`OEM COLOR BOX final.pdf`). Product claims follow the packaging wording ("helps repel").

### Catalogue at launch (seed data)

Product **IBADA ONE**, stock tracked in single units.

| Bundle (EN) | Units | Coverage | Price | Compare-at | Save | Per unit | Badge | Default |
|---|---|---|---|---|---|---|---|---|
| Single Room Protection | 1 | 50 m² | $20 | $30 | 33% | $20 | none | |
| Multi-Room Protection | 2 | 100 m² | $36 | $60 | 40% | $18 | MOST POPULAR | ✓ |
| Family Pack | 3 | 150 m² | $51 | $90 | 43% | $17 | none | |
| Full Home Protection | 4 | 200 m² | $60 | $120 | 50% | $15 | BEST VALUE | |

"Save %" and "per unit" are always computed from price, compare-at and units, never stored. Save % is rounded to the nearest whole percent.

## 3. Architecture

A single Next.js application (latest stable major at build time, App Router, TypeScript strict).

```
ibadashop.com/en/...   ┐
ibadashop.com/ar/...   ┴─ Storefront (static + on-demand revalidation)
ibadashop.com/admin/...   Admin (dynamic, auth-protected, installable PWA)
ibadashop.com/api/auth/*  Better Auth handler
```

### Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router), React Server Components, Server Actions |
| Styling | Tailwind CSS v4 with brand tokens; CSS logical properties for RTL |
| Admin UI components | shadcn/ui (Radix primitives), lucide-react icons, Recharts for charts |
| Storefront interactivity | Minimal client components: cart drawer, bundle picker, carousel (Embla), sticky add-to-cart |
| Database | PostgreSQL. Production: Supabase Postgres via the pooled connection. Local dev + tests: PGlite (embedded Postgres, no install). |
| ORM / migrations | Drizzle ORM + drizzle-kit (SQL migrations checked into the repo) |
| Validation | Zod on every server boundary |
| i18n | next-intl, locale prefix `/en` and `/ar`, `dir="rtl"` for Arabic |
| Auth (admin only) | Better Auth: email + password, `twoFactor` plugin (TOTP + backup codes), database sessions |
| Image storage | Storage adapter interface: `local` (dev/test, `public/uploads`) and `supabase` (prod, Supabase Storage bucket) |
| Image processing | `sharp`: re-encode uploads to WebP (max 2400 px), strip metadata |
| Push | Web Push (VAPID) via the `web-push` library; service worker scoped to `/admin/` |
| Bot protection | Cloudflare Turnstile on checkout and track-order (official test keys in dev/test) |
| Hosting | Vercel (app) + Supabase (database, storage) |
| Tests | Vitest (unit + integration on PGlite), Playwright (E2E) |

### Code layout

```
src/
  app/
    [locale]/(shop)/          storefront routes
    admin/(auth)/             login, 2FA, accept-invite
    admin/(dashboard)/        admin routes
    api/auth/[...all]/        Better Auth
    api/events/               anonymous funnel events (POST)
    manifest / icons          admin PWA manifest (scope /admin/)
  server/                     domain logic, framework-free where possible
    db/ schema.ts client.ts migrations/ seed.ts
    catalog.ts pricing.ts discounts.ts orders.ts inventory.ts
    customers.ts reviews.ts settings.ts analytics.ts
    phone.ts lebanon.ts rate-limit.ts turnstile.ts
    auth.ts permissions.ts audit.ts push.ts
    storage/ index.ts local.ts supabase.ts
  components/ shop/ admin/ ui/ brand/
  i18n/ routing.ts request.ts
messages/ en.json ar.json
public/ admin-sw.js (served at /admin/sw.js), seed images
tests/ unit/ integration/ e2e/
docs/ DEPLOY.md
```

Domain modules in `src/server/` hold all business rules and are unit-tested directly. Route handlers and Server Actions stay thin: they authenticate, validate with Zod, call the domain module, and revalidate caches.

### Configuration (env)

`DATABASE_URL` (unset → PGlite at `.data/pglite`), `SITE_URL`, `BETTER_AUTH_SECRET`, `STORAGE_DRIVER` (`local` | `supabase`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. A validated `env.ts` fails fast on boot if a production-required value is missing. `.env.example` documents all of them.

## 4. Data model

All money is stored as integer **cents** (USD). All tables have `id` (uuid), `created_at` and `updated_at` unless noted.

- **products**: `slug` (unique), `name_en`, `name_ar`, `tagline_en/ar`, `description_en/ar`, `status` (`active`|`draft`), `stock_units` (int ≥ 0), `low_stock_threshold`, `seo_title_en/ar`, `seo_description_en/ar`, `sort_order`
- **product_images**: `product_id`, `url`, `alt_en`, `alt_ar`, `width`, `height`, `position`
- **bundles**: `product_id`, `name_en/ar`, `subtitle_en/ar` (e.g. "Up to 100m² coverage"), `units` (int ≥ 1), `price_cents`, `compare_at_cents` (nullable, must be > price), `badge` (`none`|`most_popular`|`best_value`), `image_id` (nullable), `is_default`, `position`, `active`
- **customers**: `phone` (E.164, unique), `name`, `order_count` (non-cancelled), `total_spent_cents` (delivered, not returned), `last_order_at`, `notes`, `blocked` (bool), `blocked_reason`
- **orders**:
  - `number` (int, sequence starting at 1001, unique), `idempotency_key` (unique), `customer_id`, `locale`
  - Contact and address snapshot: `name`, `phone`, `governorate`, `district`, `town`, `address_line`, `landmark`, `notes`
  - Totals: `subtotal_cents`, `discount_cents`, `delivery_cents`, `total_cents`, `discount_code` (snapshot)
  - `status` (`new`|`confirmed`|`out_for_delivery`|`delivered`|`cancelled`|`returned`), `payment_status` (`pending`|`paid`), `ip_hash`
- **order_items**: `order_id`, `product_id`, `bundle_id`, `product_name`, `bundle_name` (snapshots), `units_per_bundle`, `quantity`, `unit_price_cents`, `line_total_cents`
- **order_events**: `order_id`, `type` (`created`|`status_changed`|`note`), `from_status`, `to_status`, `note`, `user_id` (nullable = system/customer)
- **inventory_movements**: `product_id`, `delta_units`, `reason` (`order`|`cancel`|`return`|`manual`|`initial`), `order_id`, `user_id`, `note`
- **discounts**: `code` (unique, case-insensitive), `type` (`percent`|`fixed`), `value` (percent 1–100, or cents), `min_subtotal_cents`, `usage_limit` (nullable), `used_count`, `once_per_phone` (bool), `starts_at`, `ends_at`, `active`
- **discount_redemptions**: `discount_id`, `order_id`, `phone`; unique (`discount_id`, `phone`) enforced when `once_per_phone`
- **reviews**: `product_id`, `author_name`, `rating` (1–5), `body`, `locale`, `photo_url` (nullable), `visible`, `review_date`
- **settings**: a single row. Store name, contact phone/email, social links, `announcement_en/ar`, `announcement_enabled`, `delivery_fee_cents` (default 0), `free_delivery_threshold_cents` (nullable), `delivery_time_en/ar`, `trustpilot_url` (nullable)
- **push_subscriptions**: `user_id`, `endpoint` (unique), `p256dh`, `auth`, `user_agent`, `last_success_at`
- **events** (anonymous funnel): `type` (`view_product`|`add_to_cart`|`begin_checkout`|`order_placed`), `session_id` (random first-party cookie, no personal data), `locale`, `created_at`
- **rate_limits**: `key`, `window_start`, `count`
- **audit_log**: `user_id`, `action`, `entity`, `entity_id`, `summary`, `ip_hash`, `created_at`
- **Better Auth tables** (user, session, account, verification, twoFactor), with `user.role` (`owner`|`staff`) and `user.active`
- **staff_invites**: `email`, `role`, `token_hash`, `expires_at`, `accepted_at`, `invited_by`

## 5. Storefront

### Global

- Mobile-first layout. `lang` and `dir` are set per locale.
- Western digits for prices in both locales (`$36`).
- The language switcher keeps the current page.
- Header: logo, nav (Shop, How it works, Reviews), language switch, cart button with a count badge.
- Announcement bar (text from settings).
- Footer: contact, policy links, social links, "Cash on delivery" note.

### Home = product landing page for the store's featured product

Sections, top to bottom:

1. **Hero:**
   - Image carousel with thumbnails (swipe on mobile).
   - Rating summary (from visible reviews; hidden if there are none).
   - Gradient headline "PEST FREE LIVING", sub-headline "One device. A calmer home.", tagline.
   - Price (navy), compare-at (struck through, grey), "Save X%" pill (blue).
   - Five benefit ticks: up to 50 m² per unit, 24/7 protection, no chemicals / no odor, safe for kids & pets, plug in & forget.
2. **Bundle picker:**
   - 4 radio cards showing name, coverage subtitle, price, compare-at, save %, per-unit price and badge ribbon.
   - Selecting a card updates the hero image and the price.
   - Keyboard- and screen-reader-accessible (radio group semantics).
3. **Purchase block:**
   - Delivery-time line from settings.
   - Quantity stepper.
   - ADD TO CART (navy, full width). Adding opens the cart drawer.
   - "60-day money back guarantee" line.
4. **Sticky add-to-cart bar:** appears when the main button leaves the viewport. Shows a thumbnail, bundle name, price and the button.
5. **Easy to use:** 2 steps with illustrations.
6. **Works against 40+ pests:** icon grid (cockroach, rodents, bed bug, spider, mosquito, fly, ant, flea, termite).
7. **IBADA vs other pesticide solutions:** two-column ✓/✗ comparison using the deck copy.
8. **Reviews:** average, count, star distribution, review cards with "load more".
9. **FAQ:** accordion. Copy lives in the translation files.

### Other pages

- **`/[locale]/products/[slug]`:** the same product template. Home renders the featured (first active) product through this template.
- **`/[locale]/shop`:** grid of active products.
- **Cart drawer:**
  - Line items with bundle name, image, quantity stepper and remove.
  - Subtotal, delivery line ("FREE" or the fee), checkout button.
  - The cart is stored in `localStorage` as `{bundleId, quantity}[]` only. Prices are re-fetched from the server whenever the drawer opens.
- **`/[locale]/checkout`:** see Section 6.
- **`/[locale]/order/[number]`:** thank-you / confirmation page.
  - Shown only to the browser that placed the order: a signed, short-lived cookie holds the order id.
  - Anyone else is redirected to track-order.
- **`/[locale]/track`:** order number + phone + Turnstile. Shows status, a timeline and items. Rate-limited.
- **`/[locale]/contact`:** store phone, email and social links from settings (plus a WhatsApp click-to-chat link if a phone is set). No contact form.
- **Policy pages:**
  - `/[locale]/policies/shipping`, `/returns` (60-day guarantee), `/privacy`, `/terms`.
  - Starter copy is provided in EN + AR and marked for the owner to review.

### SEO

- Per-locale metadata, `hreflang` alternates, canonical URLs, `sitemap.xml`, `robots.txt` (disallows `/admin`, `/checkout`, `/order`, `/track`).
- Open Graph image.
- `Product` JSON-LD with `offers` (price, availability) and `aggregateRating` only when reviews exist.

### Rendering and cache

- Storefront pages are statically generated and tagged (`catalog`, `reviews`, `settings`).
- Admin mutations call `revalidateTag` for the affected tag.
- Stock-driven "sold out" state revalidates `catalog` when a product's stock crosses zero in either direction.

## 6. Checkout and orders

### Checkout form

| Field | Rule |
|---|---|
| Full name | 2–80 chars, trimmed |
| Phone | Lebanese mobile. Accepts `03xxxxxx`, `3xxxxxx`, `70/71/76/78/79/81xxxxxx`, with or without `0`, `+961` or `00961`, spaces or dashes. Normalized to E.164 (`+9613xxxxxx`, `+96170xxxxxx`). |
| Governorate | One of the 8 governorates |
| District | One of the districts of the selected governorate (26 total, see below) |
| Town / city | 2–60 chars |
| Address details | 5–200 chars (street, building, floor) |
| Landmark | Optional, ≤ 120 chars |
| Delivery notes | Optional, ≤ 300 chars |
| Discount code | Optional |

Governorates → districts:

| Governorate | Districts |
|---|---|
| Beirut | Beirut |
| Mount Lebanon | Baabda, Aley, Chouf, Metn, Keserwan, Jbeil |
| North | Tripoli, Zgharta, Koura, Bsharri, Batroun, Minieh-Danniyeh |
| Akkar | Akkar |
| Bekaa | Zahle, West Bekaa, Rashaya |
| Baalbek-Hermel | Baalbek, Hermel |
| South | Saida, Tyre, Jezzine |
| Nabatieh | Nabatieh, Marjeyoun, Hasbaya, Bint Jbeil |

All names are shown in the visitor's language.

The summary panel shows items, subtotal, discount, delivery ("FREE" or fee), total and "Payment: Cash on delivery". The discount code can be applied before submitting; the result comes from a server action that validates the code.

### `placeOrder` (server action), in order

1. **Validate** the payload with Zod: cart of `{bundleId, quantity}`, max 10 lines, quantity 1–10, plus the form fields and the `idempotencyKey` (UUID generated when the checkout page mounts).
2. **Idempotency check:** if an order with this `idempotencyKey` already exists, return it straight away, skipping steps 3–7. A retried or double-tapped submit never trips Turnstile (tokens are single-use) or the rate limit.
3. **Verify Turnstile.**
4. **Rate-limit:**
   - 5 orders per IP-hash per hour
   - 3 orders per phone per 24 h
   - Exceeding either returns a friendly localized error.
5. **Blocked phones:** if the customer's phone is blocked, reject with a generic "We couldn't place this order, please contact us" message.
6. **One database transaction:**
   1. Insert against the unique `idempotency_key`. If a concurrent duplicate wins the race, return that order instead.
   2. Load active bundles and products. Reject inactive, draft or missing ones.
   3. Compute subtotal from DB prices.
   4. Apply the discount, checking: active, date window, minimum subtotal, usage limit, and once-per-phone via `discount_redemptions`.
   5. Delivery fee: 0 if the threshold is met or the fee is 0.
   6. Total.
   7. Decrement stock per product with `UPDATE … SET stock_units = stock_units - $n WHERE id = $id AND stock_units >= $n`. If no row updates, roll back with an "out of stock" error naming the product.
   8. Upsert the customer by phone, updating name and last order time.
   9. Insert the order (next sequence number), items, the `created` event, inventory movements, the discount redemption and `used_count + 1`.
7. **After commit:**
   - Record the `order_placed` funnel event.
   - Send the push to all admin subscriptions. Push is fire-and-forget: failures are logged and never fail the order.
   - Revalidate `catalog` if stock crossed zero.
8. **Respond:** set the signed confirmation cookie and redirect to `/[locale]/order/[number]`.

### Order status machine

```
new ──► confirmed ──► out_for_delivery ──► delivered ──► returned
 │          │               │
 └──────────┴───────────────┴──► cancelled
```

- Allowed transitions are exactly the arrows above. Anything else is rejected by `orders.changeStatus`.
- **→ cancelled:** stock is restored with inventory movements, and the discount redemption is released (`used_count − 1`, redemption deleted), so the customer can use the code again.
- **→ delivered:** `payment_status = paid`; the order total is added to the customer's `total_spent_cents`.
- **→ returned (from delivered only):** stock is restored and the order total is subtracted from the customer's `total_spent_cents`. `payment_status` stays `paid` for history, the discount redemption is kept, and revenue reports exclude returned orders.
- `customers.order_count` counts all orders except cancelled ones. It is incremented at placement and decremented on cancel.
- Each transition writes an `order_events` row and an `audit_log` row.

### Revenue definitions (admin)

- **Sales:** sum of `total_cents` of orders not cancelled/returned, in the date range.
- **Collected:** delivered orders.
- **Pending cash:** new + confirmed + out for delivery.

## 7. Admin dashboard

- **Access:** `/admin`, English only.
- **Layout:**
  - Desktop: left sidebar.
  - Mobile: bottom tab bar (Home, Orders, Products, Customers, More). "More" contains Discounts, Reviews, Inventory, Settings, Staff, Activity log, Notifications.
- **PWA:**
  - Manifest with `scope: /admin/` and `start_url: /admin`, `display: standalone`, theme color navy, icons generated from the logo icon (192, 512, maskable, Apple touch).
  - Service worker at `/admin/sw.js` handles `push` (shows a notification with order number, bundles, total, district) and `notificationclick` (opens `/admin/orders/[id]`).
  - An "install" hint shows on iOS Safari when the app isn't installed yet.

### Pages

- **Home:**
  - Date range (today, 7 d, 30 d, custom).
  - Summary cards: Sales, Orders, AOV, Collected vs Pending cash.
  - Sales-over-time line chart.
  - Funnel (sessions with `view_product` → `add_to_cart` → `begin_checkout` → `order_placed`, plus conversion %).
  - Top bundles, orders by governorate, latest 10 orders, low-stock alert.
- **Orders:**
  - List with status tabs + "All", search (number, name, phone), date filter, pagination (25/page).
  - Multi-select bulk status change (only valid transitions offered). Print delivery slips for the selected orders. CSV export of the current filter.
- **Order detail:**
  - Items, totals, discount.
  - Customer card with tap-to-call phone, a link to the customer, and their previous order count.
  - Address block with copy button.
  - Status action buttons (valid next states only; cancel/return ask for confirmation).
  - Internal note input and the event timeline.
- **Delivery slip (print view):** A4 (2 per page) or 100×150 mm label. Shows order number, name, phone, full address + landmark, items, and "COD amount: $X".
- **Products:**
  - List with image, status, stock and bundle count.
  - Create/edit form with sections:
    - Details (EN/AR tabs)
    - Media (upload, drag to reorder, alt text EN/AR, delete)
    - Bundles (add/edit/reorder/deactivate: units, price, compare-at, badge, image, default; save % and per-unit preview)
    - Stock (current units, low-stock threshold)
    - SEO (EN/AR)
    - Status
- **Inventory:** stock per product, manual adjustment (+/− with a required reason), movement history.
- **Customers:** list (search, sort by spent/orders/recent). Detail: stats, orders, notes, block/unblock with reason.
- **Discounts:** list with usage, create/edit, activate/deactivate. Codes are stored uppercase.
- **Reviews:** list, filter (visible/hidden, rating), create/edit (optional photo upload), toggle visibility, delete.
- **Settings:** store info, announcement (EN/AR + on/off), delivery (fee, free threshold, delivery-time text EN/AR), Trustpilot URL (optional).
- **Staff** (owner only): list, invite (email + role, single-use link valid 72 h, shown to the owner to copy and send), change role, deactivate, revoke sessions.
- **Activity log** (owner only): filterable audit log.
- **Notifications:** enable on this device (permission prompt → subscribe), send a test notification, list and remove this user's devices.
- **Account:** change password, manage 2FA and backup codes, active sessions.

### Roles

| Area | Owner | Staff |
|---|---|---|
| Home, Orders, Products, Inventory, Customers, Reviews, Notifications, Account | ✓ | ✓ |
| Discounts, Settings, Staff, Activity log | ✓ | ✗ |

Permissions are enforced in `server/permissions.ts` and checked inside every admin Server Action and admin page loader, not only in navigation.

## 8. Security

### Admin authentication

- No public sign-up.
  - The first owner is created with the CLI command `npm run admin:create-owner`, which refuses to run if an owner already exists.
  - Everyone else joins by invite link.
- Passwords: minimum 10 characters; hashing by Better Auth (scrypt).
- TOTP 2FA is mandatory. A user without 2FA enabled is forced to the enrollment screen and can't reach any other admin page. 10 single-use backup codes are issued.
- Sessions: database-backed, cookie `HttpOnly`, `Secure`, `SameSite=Lax`, 7-day sliding expiry. Password change revokes the user's other sessions.
- Login rate limiting: 5 failed attempts per account per 15 min, and 20 per IP-hash per 15 min.
- `middleware` redirects unauthenticated `/admin` requests to login. Authorization is still re-checked server-side in every action and loader.

### Application

- Zod validation on every Server Action and route handler input.
- Drizzle parameterized queries only; no raw string-built SQL.
- React escaping. No `dangerouslySetInnerHTML` except JSON-LD built with `JSON.stringify` from server data, with `<` escaped.
- Server Actions keep Next.js's built-in origin check. Better Auth routes use its CSRF protections.
- **Security headers:**
  - HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, mic and geolocation off), `frame-ancestors 'none'`.
  - **CSP:**
    - Admin, checkout, track: nonce-based strict CSP (these routes are dynamic).
    - Static storefront pages: `default-src 'self'`; scripts from `'self'` and `https://challenges.cloudflare.com` only; images from `'self'`, `data:` and the Supabase storage host; `object-src 'none'`; `base-uri 'self'`. Inline scripts use `'unsafe-inline'` here, because nonces would force dynamic rendering. This is acceptable because these pages render no user-supplied HTML.
- **Uploads:** admin only; JPEG/PNG/WebP/AVIF, ≤ 5 MB; decoded and re-encoded by `sharp` (rejects non-images, strips EXIF). Stored with random names. Served from storage, never executed.
- **Secrets:** env vars only; `.env*` git-ignored. The Supabase service-role key is used server-side only. There is no Supabase client in the browser, and RLS is enabled with no public policies as defense in depth.
- **Privacy:** IP addresses are stored only as salted SHA-256 hashes (rate limits, audit). The funnel session cookie holds a random id with no personal data.
- **Dependencies:** lockfile committed; `npm audit --audit-level=high` in the test script.

## 9. Performance and reliability

- Static storefront with on-demand revalidation.
- `next/image` (AVIF/WebP, responsive sizes, priority hero image).
- Self-hosted subset fonts.
- The storefront's client JS is limited to the cart, picker, carousel and sticky bar.
- Order placement is fully transactional and idempotent.
- Push delivery failures are logged. Dead subscriptions (404/410) are removed automatically.
- Supabase automated daily backups.
- Vercel logs for errors.

## 10. Testing

- **Unit (Vitest):**
  - pricing (save %, per unit, rounding)
  - totals with discount + delivery threshold
  - discount eligibility rules
  - phone normalization (valid/invalid cases)
  - governorate/district validation
  - order status transitions
  - permission matrix
- **Integration (Vitest + PGlite, real migrations):**
  - `placeOrder` happy path
  - idempotent retry
  - out of stock (with concurrent orders)
  - blocked phone
  - rate limit
  - discount usage limit + once-per-phone
  - cancel/return restock
  - track-order lookup
  - admin action rejects unauthenticated and wrong-role users
- **E2E (Playwright, production build on PGlite with Turnstile test keys):**
  - English purchase on a mobile viewport
  - Arabic purchase (checks `dir=rtl`)
  - discount code
  - admin login with TOTP
  - order status change
  - product bundle price edit reflected on the storefront
- **Lighthouse** run on the product page (mobile) before launch.

## 11. Deployment (documented in `docs/DEPLOY.md`)

1. Supabase project (Postgres + Storage bucket). Can be created through the connected Supabase tools with the owner's approval. Run migrations.
2. Owner creates a Vercel account and imports the repo, then sets the env vars.
3. Owner creates a Cloudflare Turnstile site (free) and adds the keys.
4. Generate VAPID keys (`npm run push:keys`).
5. Run `npm run admin:create-owner` against production.
6. Point `ibadashop.com` DNS to Vercel.
7. Enable notifications on the owner's phone after installing the admin to the home screen.

## 12. Out of scope (v1)

- Card/online payments
- Customer accounts
- Email, SMS or WhatsApp automation
- Abandoned-cart recovery
- Drag-and-drop page/theme builder (landing-page section copy lives in translation files)
- Multiple currencies, countries or warehouses
- Public review submission form
- Courier API integrations
- Arabic admin UI
