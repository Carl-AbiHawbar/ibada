# IBADA Shop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ibadashop.com: a bilingual (EN/AR) cash-on-delivery storefront for IBADA ONE, plus a Shopify-style admin PWA with push notifications for new orders.

**Architecture:**
- One Next.js 16 App Router app.
- Business rules live in framework-free modules under `src/server/`. They take a Drizzle `Db` as their first argument and are tested against in-memory PGlite.
- Pages, Server Actions and route handlers are thin: authorize → Zod-parse → domain call → audit → refresh cache tags.
- Storefront pages are static, with tag-cached DB reads.
- Admin pages are dynamic and gated by Better Auth with mandatory TOTP.

**Tech Stack:**

| Area | Packages |
|---|---|
| Framework | next 16.3, react 19.3, TypeScript (strict) |
| Styling / UI | tailwindcss 4.3, shadcn 4 (Radix), lucide-react, recharts 3, embla-carousel-react 8, qrcode |
| i18n | next-intl 4.14 |
| Database | drizzle-orm 0.45 + drizzle-kit 0.31, postgres 3.4 (postgres-js). @electric-sql/pglite 0.5 for integration tests; embedded-postgres 18 for local dev + E2E. |
| Auth | better-auth 1.7 with `twoFactor` |
| Server libraries | zod 4, web-push 3.6, sharp 0.35, @supabase/supabase-js 2 |
| Tests / scripts | vitest 5, @playwright/test 1.63, otpauth (tests), tsx |

**Spec:** `docs/superpowers/specs/2026-09-27-ibada-shop-design.md`. Read it before starting any task. Section references below (§N) point into it.

## Global Constraints

**Money, locale, time**
- Money is integer USD cents everywhere. It is displayed only through `formatUsd` (Task 3).
- Locales are exactly `en` and `ar`, with `localePrefix: 'always'`. `ar` renders `<html lang="ar" dir="rtl">`. Western digits are used in both locales.
- All admin date ranges, day buckets, CSV exports and printed timestamps use the `Asia/Beirut` timezone.

**Brand**
- Tokens: `--color-navy: #012755`, `--color-blue: #0693E6`, `--color-ice: #EEF6FD`, `--color-ice-2: #DCEEFB`.
- Fonts via `next/font/google`: Plus Jakarta Sans (Latin), IBM Plex Sans Arabic (Arabic).

**Code structure and business rules**
- Only these may import `next/*`: files under `src/app/**`, `src/proxy.ts`, `src/server/next/**` and `src/components/**`.
- Everything else in `src/server/**` is framework-free and takes `db: Db` as its first parameter.
- Prices, discounts, delivery and stock are computed only on the server from DB rows. No client-supplied amount is ever read.
- Order numbers start at 1001 (Postgres sequence `order_number_seq`).
- Next.js 16 specifics:
  - Request interception lives in `src/proxy.ts` (not `middleware.ts`).
  - Server Actions invalidate caches with `updateTag(tag)`.

**Limits**
- Cart: at most 10 lines; quantity 1–10 per line.
- Orders: 5 per IP-hash per hour, 3 per phone per 24 h.
- Failed logins: 5 per account and 20 per IP-hash per 15 min.
- Track-order: 10 per IP-hash per 10 min.
- Discount preview: 20 per IP-hash per 10 min.
- Funnel events: 300 per IP-hash per hour.
- Rate limits are multiplied by `env.RATE_LIMIT_MULTIPLIER`. It defaults to 1 and must be 1 when `APP_ENV=production`; E2E uses 100.

**Security**
- Uploads: JPEG/PNG/WebP/AVIF up to 5 MB, re-encoded to WebP at most 2400 px wide.
- Sessions use a 7-day sliding expiry. Passwords need at least 10 characters. TOTP is mandatory, with 10 backup codes.
- No Trustpilot badge unless `settings.trustpilotUrl` is set. Ratings come only from visible reviews, and no reviews are seeded.
- Every table in the `public` schema has RLS enabled with no policies.

**Environment and git**
- Local dev and E2E use `embedded-postgres`. This deviates from spec §3 ("PGlite locally") because `next build` renders pages in several worker processes and PGlite allows only one process per data directory. PGlite stays the integration-test DB.
- Git in this repo always runs as `git -c safe.directory=F:/DEV/IBADA …`, because the F: drive doesn't record ownership. Written below as `G` (e.g. `G add …`).
- Every commit message ends with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- npm scripts never set env vars inline (Windows). Scripts load `.env.local` with `process.loadEnvFile` when it exists.

## Review Focus

1. **Arabic-Indic digits in the phone number.** A shopper on an Arabic keyboard types `٠٣ ١٢٣ ٤٥٦`. Expected: accepted and normalized to `+9613123456`. Test in Task 3.
2. **Stale cart.** A cart saved days ago holds a bundle that's now inactive or re-priced. Expected: the drawer shows current prices and removes the dead line with a notice. Checkout returns `cart_changed` instead of charging stale data. Tests in Task 5 (`quoteCart`) and Task 7 (`placeOrder`).
3. **Double cancel.** Two admins press "Cancel" on the same order at the same moment. Expected: stock is restored exactly once, and the second admin gets `conflict`. Test in Task 8.
4. **Midnight in Beirut.** An order placed at 00:30 Beirut time (21:30 UTC the previous day). Expected: it counts in "Today" and in that Beirut date's chart bucket. Tests in Task 3 (`dates`) and Task 20.
5. **Deactivated staff still logged in.** A staff member is deactivated while logged in on their phone. Expected: their next admin request is refused, and their devices stop receiving order pushes. Tests in Task 14 (`authorize`), Task 9 (`notifyAdmins` skips inactive users) and Task 19 (sessions + subscriptions deleted).

## File Map

```
package.json, next.config.ts, drizzle.config.ts, vitest.config.ts, playwright.config.ts, components.json
.env.example, README.md, docs/DEPLOY.md
assets/source/                     original brand PNGs from the owner's Drive (committed)
scripts/
  local-db.ts                      start embedded Postgres for dev (port 54329, .data/pg)
  migrate.ts  seed.ts              apply drizzle migrations / seed catalog + settings
  create-owner.ts                  first owner account (CLI)
  prepare-assets.ts                brand PNG → public/ WebP, favicons, PWA icons
  e2e-serve.ts  e2e-fixtures.ts    fresh e2e DB (port 54330) + build + start on :3100
drizzle/                           generated SQL migrations (+ custom RLS migrations)
messages/en.json, messages/ar.json
src/
  env.ts                           typed env (parseEnv/getEnv)
  proxy.ts                         i18n routing, admin cookie gate, CSP
  lib/                             pure, client-safe: money, phone, lebanon, order-status, permissions, dates, cart-schema, cart-store, track, auth-client
  server/
    db/ schema.ts auth-schema.ts client.ts seed.ts
    catalog.ts settings.ts reviews.ts discounts.ts customers.ts analytics.ts audit.ts push.ts
    rate-limit.ts crypto.ts turnstile.ts images.ts
    orders/ schema.ts place-order.ts manage.ts admin-query.ts csv.ts
    admin/ products.ts customers.ts staff.ts
    auth/ auth.ts users.ts invites.ts authorize.ts
    storage/ index.ts local.ts supabase.ts
    security/ csp.ts
    next/ cache.ts storefront-data.ts admin-session.ts order-cookie.ts request.ts
  content/policies.ts
  components/ brand/ shop/ admin/ ui/ (shadcn)
  app/
    [locale]/layout.tsx, not-found.tsx
    [locale]/(shop)/ page.tsx products/[slug] shop checkout order/[number] track contact policies/[slug] actions.ts
    admin/layout.tsx  admin/(auth)/…  admin/(dashboard)/…  admin/manifest.webmanifest/route.ts
    api/auth/[...all]/route.ts  api/events/route.ts
    sitemap.ts robots.ts icon.png apple-icon.png
public/ images/products/*.webp  admin/sw.js  admin/icons/*.png
tests/ helpers/ unit/ integration/ e2e/
```

---

### Task 1: Project scaffold, tooling and typed env

**Files:**
- Create: Next.js scaffold in the repo root. Keep the existing `.gitignore` entries and add the scaffold's. Keep `docs/`.
- Create: `src/env.ts`, `.env.example`, `vitest.config.ts`, `tests/unit/env.test.ts`, `src/app/globals.css` (brand tokens)
- Modify: `package.json` (scripts), `tsconfig.json` (`"strict": true, "noUncheckedIndexedAccess": true`)

**Interfaces:**
- Produces:
  - `type AppEnv = 'development' | 'test' | 'production'`
  - `type Env = { APP_ENV; DATABASE_URL; SITE_URL; BETTER_AUTH_SECRET; STORAGE_DRIVER: 'local' | 'supabase'; SUPABASE_URL?; SUPABASE_SERVICE_ROLE_KEY?; SUPABASE_STORAGE_BUCKET; VAPID_PUBLIC_KEY?; VAPID_PRIVATE_KEY?; VAPID_SUBJECT; TURNSTILE_SITE_KEY; TURNSTILE_SECRET_KEY; RATE_LIMIT_MULTIPLIER: number }`
  - `parseEnv(raw: Record<string, string | undefined>): Env` (throws an `Error` whose message lists every bad key)
  - `getEnv(): Env` (memoized `parseEnv(process.env)`)

- [ ] **Step 1: Scaffold the app**

Run: `npx create-next-app@16.3.6 . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --yes`

If it refuses because of existing files, scaffold into `./.scaffold`, move its contents up, and delete `./.scaffold`. Then install:

```bash
npm i next-intl drizzle-orm postgres better-auth zod web-push sharp @supabase/supabase-js embla-carousel-react recharts lucide-react qrcode server-only
npm i -D drizzle-kit @electric-sql/pglite embedded-postgres vitest @playwright/test otpauth tsx @types/web-push @types/qrcode
npx shadcn@latest init -d
npx shadcn@latest add button input label textarea select dialog alert-dialog dropdown-menu table tabs badge card checkbox switch sheet sonner separator skeleton popover calendar tooltip
```

- [ ] **Step 2: Write the failing env test** in `tests/unit/env.test.ts`

```ts
import { parseEnv } from '@/env';
const base = { DATABASE_URL: 'postgres://x', SITE_URL: 'http://localhost:3000', BETTER_AUTH_SECRET: 'a'.repeat(32) };
const prod = { ...base, APP_ENV: 'production', SITE_URL: 'https://ibadashop.com', STORAGE_DRIVER: 'supabase',
  SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k', VAPID_PUBLIC_KEY: 'p', VAPID_PRIVATE_KEY: 'q',
  TURNSTILE_SITE_KEY: 's', TURNSTILE_SECRET_KEY: 't' };

test('development defaults', () => {
  const e = parseEnv(base);
  expect(e.APP_ENV).toBe('development');
  expect(e.STORAGE_DRIVER).toBe('local');
  expect(e.TURNSTILE_SITE_KEY).toBe('1x00000000000000000000AA');
  expect(e.TURNSTILE_SECRET_KEY).toBe('1x0000000000000000000000000000000AA');
  expect(e.SUPABASE_STORAGE_BUCKET).toBe('product-images');
  expect(e.VAPID_SUBJECT).toBe('mailto:admin@ibadashop.com');
  expect(e.RATE_LIMIT_MULTIPLIER).toBe(1);
});
test('production requires every service key', () => {
  expect(() => parseEnv({ ...base, APP_ENV: 'production' })).toThrow(/SUPABASE_URL/);
  expect(parseEnv(prod).STORAGE_DRIVER).toBe('supabase');
});
test('production rejects local storage, test turnstile keys and a multiplier', () => {
  expect(() => parseEnv({ ...prod, STORAGE_DRIVER: 'local' })).toThrow(/STORAGE_DRIVER/);
  expect(() => parseEnv({ ...prod, TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' })).toThrow(/TURNSTILE/);
  expect(() => parseEnv({ ...prod, RATE_LIMIT_MULTIPLIER: '100' })).toThrow(/RATE_LIMIT_MULTIPLIER/);
});
test('secret must be at least 32 chars', () => {
  expect(() => parseEnv({ ...base, BETTER_AUTH_SECRET: 'short' })).toThrow(/BETTER_AUTH_SECRET/);
});
```

- [ ] **Step 3: Configure Vitest** in `vitest.config.ts`
  - `environment: 'node'`
  - `include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts']`
  - alias `@` → `src`
  - alias `server-only` → an empty module (`tests/helpers/empty.ts`)
  - `test.env`: `DATABASE_URL=postgres://unused`, `BETTER_AUTH_SECRET=test-secret-test-secret-test-secret!!`, `SITE_URL=http://localhost:3000`, `APP_ENV=test`
  - `testTimeout: 20000`

  Run `npx vitest run tests/unit/env.test.ts`. Expected: FAIL (`@/env` not found).

- [ ] **Step 4: Implement `parseEnv` / `getEnv`** in `src/env.ts` with a Zod object.
  - `APP_ENV` defaults to `development`.
  - Production-only rules go in `superRefine`.
  - `.env.example` lists every key with a comment. It includes `APP_ENV=development` and `DATABASE_URL=postgres://postgres:postgres@localhost:54329/ibada`.

- [ ] **Step 5: Brand tokens** in `src/app/globals.css`, using Tailwind v4 `@theme`:
  - `--color-navy`, `--color-blue`, `--color-ice`, `--color-ice-2`
  - `--color-ink: #0F172A`, `--color-muted: #64748B`, `--color-line: #E2E8F0`
  - `--radius-card: 1rem`
  - `--font-sans: var(--font-jakarta)`, `--font-arabic: var(--font-plex-arabic)`

  Map the shadcn `--primary` to navy and `--ring` to blue.

- [ ] **Step 6: Scripts** in `package.json`:

| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint .` |
| `test` | `vitest run` |
| `test:e2e` | `playwright test` |
| `audit` | `npm audit --audit-level=high` |
| `check` | `npm run typecheck && npm run lint && npm run test && npm run audit` |
| `db:start` | `tsx scripts/local-db.ts` |
| `db:generate` | `drizzle-kit generate` |
| `db:migrate` | `tsx scripts/migrate.ts` |
| `db:seed` | `tsx scripts/seed.ts` |
| `admin:create-owner` | `tsx scripts/create-owner.ts` |
| `push:keys` | `web-push generate-vapid-keys --json` |
| `assets` | `tsx scripts/prepare-assets.ts` |

- [ ] **Step 7: Verify** by running `npm run test && npm run typecheck && npm run lint`. Expected: all pass; 4 env tests green.

- [ ] **Step 8: Commit**

```bash
G add -A && G commit -m "chore: scaffold Next.js 16 app with typed env and tooling"
```

---

### Task 2: Database schema, migrations, local Postgres and seed

**Files:**
- Create: `drizzle.config.ts`, `src/server/db/schema.ts`, `src/server/db/auth-schema.ts`, `src/server/db/client.ts`, `src/server/db/seed.ts`
- Create: `scripts/local-db.ts`, `scripts/migrate.ts`, `scripts/seed.ts`
- Create: `tests/helpers/db.ts`, `tests/integration/db.test.ts`
- Generated: `drizzle/0000_*.sql` and a custom `drizzle/0001_rls.sql` (`npx drizzle-kit generate --custom --name rls`)

**Interfaces:**
- Produces:
  - `type Db = PgDatabase<PgQueryResultHKT, typeof schema>` (transactions are also `Db`)
  - `getDb(): Db` (lazy postgres-js client, `prepare: false`, `max: 5`, cached on `globalThis` in dev)
  - Schema exports: `products, productImages, bundles, customers, orders, orderItems, orderEvents, inventoryMovements, discounts, discountRedemptions, reviews, settings, pushSubscriptions, events, rateLimits, auditLog, staffInvites, orderNumberSeq`
  - Auth exports: `user, session, account, verification, twoFactor`
  - `seedCatalog(db): Promise<{ productId: string; bundleIds: { single: string; double: string; triple: string; full: string } }>`
  - `seedSettings(db): Promise<void>`
  - Test helper: `createTestDb(): Promise<{ db: Db; close(): Promise<void> }>`

- [ ] **Step 1: Write the failing test** in `tests/integration/db.test.ts`

```ts
let t: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => { t = await createTestDb(); });
afterEach(() => t.close());

test('seedCatalog is idempotent and matches the pricing sheet', async () => {
  await seedCatalog(t.db); await seedCatalog(t.db);
  const ps = await t.db.select().from(products);
  expect(ps).toHaveLength(1);
  expect(ps[0]).toMatchObject({ slug: 'ibada-one', nameEn: 'IBADA ONE', status: 'active', stockUnits: 100 });
  const bs = await t.db.select().from(bundles).orderBy(bundles.position);
  expect(bs.map(b => b.units)).toEqual([1, 2, 3, 4]);
  expect(bs.map(b => b.priceCents)).toEqual([2000, 3600, 5100, 6000]);
  expect(bs.map(b => b.compareAtCents)).toEqual([3000, 6000, 9000, 12000]);
  expect(bs.map(b => b.badge)).toEqual(['none', 'most_popular', 'none', 'best_value']);
  expect(bs.filter(b => b.isDefault).map(b => b.nameEn)).toEqual(['Multi-Room Protection']);
  expect(await t.db.select().from(productImages)).toHaveLength(4);
  expect(await t.db.select().from(inventoryMovements)).toMatchObject([{ deltaUnits: 100, reason: 'initial' }]);
});
test('settings defaults', async () => {
  await seedSettings(t.db);
  const [s] = await t.db.select().from(settings);
  expect(s).toMatchObject({ deliveryFeeCents: 0, freeDeliveryThresholdCents: null, announcementEnabled: true, trustpilotUrl: null });
});
test('order numbers start at 1001', async () => {
  const r = await t.db.execute(sql`select nextval('order_number_seq') as n`);
  expect(Number(r.rows[0].n)).toBe(1001);
});
test('every public table has RLS enabled', async () => {
  const r = await t.db.execute(sql`select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and not c.relrowsecurity and relname <> '__drizzle_migrations'`);
  expect(r.rows).toEqual([]);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/integration/db.test.ts`. Expected: FAIL (modules missing).

- [ ] **Step 3: Write the schema** following spec §4 field by field, in camelCase TS with snake_case columns.
  - **pgEnums:** `product_status`, `bundle_badge`, `order_status`, `payment_status`, `order_event_type`, `movement_reason`, `discount_type`, `funnel_event_type`, `staff_role`
  - **Sequence:** `pgSequence('order_number_seq', { startWith: 1001 })`. `orders.number` defaults to `nextval('order_number_seq')`.
  - **Keys:** uuid PKs with `defaultRandom()`.
  - **`settings.social`:** `jsonb` typed `{ instagram?: string; facebook?: string; tiktok?: string }`, default `'{}'`.
  - **Constraints and indexes:**
    - `rateLimits` PK is (`key`, `windowStart`).
    - Unique: `discount_redemptions(discount_id, phone)`, `orders.idempotency_key`, `customers.phone`, `push_subscriptions.endpoint`, and `upper(code)` on discounts.
    - Check constraints: `products.stock_units >= 0`, `bundles.units >= 1`, `bundles.compare_at_cents IS NULL OR compare_at_cents > price_cents`, `reviews.rating BETWEEN 1 AND 5`.
    - Indexes: `orders(status, created_at)`, `orders(phone)`, `events(type, created_at)`.
  - **`auth-schema.ts`:** Better Auth 1.7 core tables with text ids.
    - `user`: `id, name, email (unique), emailVerified, image, createdAt, updatedAt, twoFactorEnabled (bool, default false), role (staff_role, default 'staff'), active (bool, default true)`
    - `session`: `id, expiresAt, token (unique), createdAt, updatedAt, ipAddress, userAgent, userId → user.id on delete cascade`
    - `account`: `id, accountId, providerId, userId → user.id cascade, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt`
    - `verification`: `id, identifier, value, expiresAt, createdAt, updatedAt`
    - `twoFactor`: `id, secret, backupCodes, userId → user.id cascade`
    - Columns `order_events.user_id`, `inventory_movements.user_id`, `audit_log.user_id`, `push_subscriptions.user_id`, `staff_invites.invited_by`: text FK → `user.id`, `on delete set null` (`cascade` for push_subscriptions).
- [ ] **Step 4: Generate migrations.**
  - Run `npm run db:generate`, then `npx drizzle-kit generate --custom --name rls`.
  - Fill `0001_rls.sql` with `ALTER TABLE "<t>" ENABLE ROW LEVEL SECURITY;` for every table.
- [ ] **Step 5: Implement `createTestDb`.**
  - `new PGlite()` (in-memory) + `drizzle(pglite, { schema })`, then `migrate(db, { migrationsFolder: 'drizzle' })` from `drizzle-orm/pglite/migrator`.
  - `close` calls `pglite.close()`.
- [ ] **Step 6: Implement `seedSettings` and `seedCatalog`.**
  - Both insert only when absent: settings when no row exists, the product by slug `ibada-one`. Owner edits are never overwritten.
  - **Settings copy:**
    - `announcementEn`: `Free delivery · Cash on delivery · 60-day money-back guarantee`
    - `announcementAr`: `توصيل مجاني · الدفع عند الاستلام · ضمان استرداد المال لمدة 60 يومًا`
    - `deliveryTimeEn`: `Orders are typically delivered in 2–4 business days`
    - `deliveryTimeAr`: `يتم توصيل الطلبات عادةً خلال 2–4 أيام عمل`
    - `storeName`: `IBADA`
  - **Product copy:**
    - `taglineEn`: `Helps repel unwanted pests using ultrasonic technology.`
    - `taglineAr`: `يساعد على إبعاد الحشرات والقوارض غير المرغوب فيها بتقنية الموجات فوق الصوتية.`
    - `descriptionEn`: the packaging paragraph ("IBADA uses ultrasonic technology … a calmer, more comfortable home.") + "How it works" paragraph + "Specifications: 220V · Indoor use · Plug-and-protect, no setup required".
    - `descriptionAr`: the same three paragraphs in Arabic.
  - **Bundles:** as spec §2.
    - EN names: Single Room Protection / Multi-Room Protection / Family Pack / Full Home Protection.
    - AR names: `حماية غرفة واحدة` / `حماية عدة غرف` / `باقة العائلة` / `حماية المنزل بالكامل`.
    - Subtitles: EN `Up to {50|100|150|200}m² coverage`, AR `تغطية حتى {…} م²`.
  - **Images:** `/images/products/ibada-one-{single,double,triple,full}.webp`, each linked from its bundle. Width and height are read with `sharp(file).metadata()` from `public/`.
  - **Stock:** 100 units, plus an `initial` movement.
- [ ] **Step 7: Local DB scripts.**
  - `scripts/local-db.ts`: starts `EmbeddedPostgres` with `databaseDir: '.data/pg'`, `port: 54329`, `user: 'postgres'`, `password: 'postgres'`, `persistent: true`. It initialises and creates database `ibada` on first run, then keeps running until Ctrl+C.
  - `scripts/migrate.ts`: `drizzle-orm/postgres-js/migrator` against `DATABASE_URL`.
  - `scripts/seed.ts`: runs `seedSettings` + `seedCatalog`.
  - Copy the owner's PNGs to `assets/source/`. They are in the session scratchpad `drive/`, or can be re-downloaded from Drive folder `1BlWYiNJFghqLLZAqqtt-wz_aDrjXBfev`. Names: `logo-icon.png`, `logo-word.png`, `one-single.png`, `one-double.png`, `one-triple.png`, `one-full.png`.
  - Add the first half of `scripts/prepare-assets.ts`: `assets/source/one-*.png` → `public/images/products/ibada-one-*.webp` (max 1600 px, quality 85).
- [ ] **Step 8: Run** `npm run assets && npx vitest run tests/integration/db.test.ts`. Expected: PASS (4 tests).
- [ ] **Step 9: Smoke-test the real DB.** In one terminal run `npm run db:start`; in another run `npm run db:migrate && npm run db:seed`. Expected: both exit 0, and a second `db:seed` is a no-op.
- [ ] **Step 10: Commit**

```bash
G add -A && G commit -m "feat(db): schema, migrations with RLS, seed data and local Postgres"
```

---

### Task 3: Pure helpers: money, phone, Lebanon, status, permissions, dates

**Files:**
- Create in `src/lib/`: `money.ts`, `phone.ts`, `lebanon.ts`, `order-status.ts`, `permissions.ts`, `dates.ts`
- Test: `tests/unit/{money,phone,lebanon,order-status,permissions,dates}.test.ts`

**Interfaces:**
- **money.ts:**
  - `formatUsd(cents: number): string`: `$36` for whole dollars, `$32.40` otherwise, `-$3.60` for negatives
  - `savePercent(priceCents: number, compareAtCents: number | null): number | null`: `Math.round((1 - price/compareAt) * 100)`; null when compareAt is null or ≤ price
  - `perUnitCents(priceCents: number, units: number): number`: `Math.round(price/units)`
- **phone.ts:**
  - `normalizeLebanesePhone(input: string): string | null`
  - `formatLebanesePhone(e164: string): string`: `+9613123456` → `03 123 456`, `+96170123456` → `70 123 456`
- **lebanon.ts:**
  - `GovernorateId`, `DistrictId` (union types)
  - `GOVERNORATES: readonly { id: GovernorateId; en: string; ar: string; districts: readonly { id: DistrictId; en: string; ar: string }[] }[]`
  - `isValidDistrict(g: string, d: string): boolean`
  - `districtName(d: DistrictId, locale: 'en' | 'ar'): string`
  - `governorateName(g: GovernorateId, locale: 'en' | 'ar'): string`
- **order-status.ts:**
  - `ORDER_STATUSES = ['new','confirmed','out_for_delivery','delivered','cancelled','returned'] as const`
  - `type OrderStatus`
  - `canTransition(from: OrderStatus, to: OrderStatus): boolean`
  - `nextStatuses(from: OrderStatus): OrderStatus[]`
- **permissions.ts:**
  - `type StaffRole = 'owner' | 'staff'`
  - `type Area = 'home'|'orders'|'products'|'inventory'|'customers'|'reviews'|'notifications'|'account'|'discounts'|'settings'|'staff'|'activity'`
  - `can(role: StaffRole, area: Area): boolean`
- **dates.ts:**
  - `beirutDateKey(d: Date): string` (`YYYY-MM-DD`)
  - `beirutDayStart(dateKey: string): Date`
  - `rangeForPreset(p: 'today'|'7d'|'30d', now: Date): { from: Date; to: Date }` (`to` exclusive; `7d` = today and the 6 days before)
  - `formatBeirut(d: Date, style: 'datetime' | 'date'): string` (`2026-09-27 00:30` / `2026-09-27`)
  - Everything uses `Intl.DateTimeFormat` with `timeZone: 'Asia/Beirut'`, so DST is handled.

- [ ] **Step 1: Write the failing tests** (key assertions)

```ts
// money
expect([[2000,3000,1],[3600,6000,2],[5100,9000,3],[6000,12000,4]].map(([p,c,u]) => [savePercent(p,c), perUnitCents(p,u)]))
  .toEqual([[33,2000],[40,1800],[43,1700],[50,1500]]);
expect(savePercent(2000, null)).toBeNull(); expect(savePercent(2000, 2000)).toBeNull();
expect(formatUsd(3600)).toBe('$36'); expect(formatUsd(3240)).toBe('$32.40'); expect(formatUsd(-360)).toBe('-$3.60');
// phone
const ok: [string, string][] = [['03 123 456','+9613123456'],['3123456','+9613123456'],['+961 3 123 456','+9613123456'],
  ['00961 70 123 456','+96170123456'],['70-123-456','+96170123456'],['081123456','+96181123456'],
  ['96176123456','+96176123456'],['٠٣ ١٢٣ ٤٥٦','+9613123456'],['۰۷۱۱۲۳۴۵۶','+96171123456'],['(78) 123.456','+96178123456']];
ok.forEach(([i, o]) => expect(normalizeLebanesePhone(i)).toBe(o));
['01 123 456','72123456','0312345','','+1 555 123 4567','031234567'].forEach(i => expect(normalizeLebanesePhone(i)).toBeNull());
expect(formatLebanesePhone('+9613123456')).toBe('03 123 456');
// lebanon
expect(GOVERNORATES).toHaveLength(8);
expect(GOVERNORATES.flatMap(g => g.districts)).toHaveLength(26);
expect(isValidDistrict('mount-lebanon','metn')).toBe(true); expect(isValidDistrict('beirut','tripoli')).toBe(false);
// order-status
expect(nextStatuses('new')).toEqual(['confirmed','cancelled']);
expect(nextStatuses('confirmed')).toEqual(['out_for_delivery','cancelled']);
expect(nextStatuses('out_for_delivery')).toEqual(['delivered','cancelled']);
expect(nextStatuses('delivered')).toEqual(['returned']);
expect(nextStatuses('cancelled')).toEqual([]); expect(canTransition('new','delivered')).toBe(false);
// permissions
(['discounts','settings','staff','activity'] as const).forEach(a => { expect(can('staff', a)).toBe(false); expect(can('owner', a)).toBe(true); });
(['home','orders','products','inventory','customers','reviews','notifications','account'] as const).forEach(a => expect(can('staff', a)).toBe(true));
// dates (Beirut is UTC+3 in September, UTC+2 in January)
expect(beirutDateKey(new Date('2026-09-26T21:30:00Z'))).toBe('2026-09-27');
expect(beirutDateKey(new Date('2026-01-10T22:30:00Z'))).toBe('2026-01-11');
expect(rangeForPreset('today', new Date('2026-09-26T21:30:00Z')))
  .toEqual({ from: new Date('2026-09-26T21:00:00Z'), to: new Date('2026-09-27T21:00:00Z') });
expect(rangeForPreset('7d', new Date('2026-09-27T09:00:00Z')).from).toEqual(new Date('2026-09-20T21:00:00Z'));
expect(formatBeirut(new Date('2026-09-26T21:30:00Z'), 'datetime')).toBe('2026-09-27 00:30');
```

- [ ] **Step 2: Run** `npx vitest run tests/unit`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement the six modules.**
  - **Phone algorithm:**
    1. Map U+0660–0669 and U+06F0–06F9 to `0–9`.
    2. Strip every non-digit (keeping a leading `+`).
    3. Remove a leading `+961`, `00961` or `961`, then a single leading `0`.
    4. Accept `^3\d{6}$` or `^(70|71|76|78|79|81)\d{6}$` and return `+961` + the digits.
  - **District data** (id / en / ar):

    | Governorate | Districts |
    |---|---|
    | `beirut` Beirut / بيروت | `beirut` Beirut / بيروت |
    | `mount-lebanon` Mount Lebanon / جبل لبنان | `baabda` بعبدا, `aley` عاليه, `chouf` الشوف, `metn` المتن, `keserwan` كسروان, `jbeil` جبيل |
    | `north` North / الشمال | `tripoli` طرابلس, `zgharta` زغرتا, `koura` الكورة, `bsharri` بشري, `batroun` البترون, `minieh-danniyeh` المنية-الضنية |
    | `akkar` Akkar / عكار | `akkar` عكار |
    | `bekaa` Bekaa / البقاع | `zahle` زحلة, `west-bekaa` البقاع الغربي, `rashaya` راشيا |
    | `baalbek-hermel` Baalbek-Hermel / بعلبك-الهرمل | `baalbek` بعلبك, `hermel` الهرمل |
    | `south` South / الجنوب | `saida` صيدا, `tyre` صور, `jezzine` جزين |
    | `nabatieh` Nabatieh / النبطية | `nabatieh` النبطية, `marjeyoun` مرجعيون, `hasbaya` حاصبيا, `bint-jbeil` بنت جبيل |

    English district names are the Title Case of the id, with these exceptions: `West Bekaa`, `Minieh-Danniyeh`, `Bint Jbeil`.
- [ ] **Step 4: Run** `npx vitest run tests/unit`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
G add -A && G commit -m "feat(lib): money, Lebanese phone, districts, order status, permissions, Beirut dates"
```

---

### Task 4: Security primitives: rate limiter, signing, IP hashing, Turnstile

**Files:**
- Create: `src/server/rate-limit.ts`, `src/server/crypto.ts`, `src/server/turnstile.ts`
- Test: `tests/integration/rate-limit.test.ts`, `tests/unit/crypto.test.ts`, `tests/unit/turnstile.test.ts`

**Interfaces:**
- Consumes: `Db`, `getEnv`.
- **rate-limit.ts:**
  - `hitLimit(db: Db, key: string, limit: number, windowSeconds: number, now?: Date): Promise<{ allowed: boolean; count: number }>`: increments first, then `allowed = count <= limit * RATE_LIMIT_MULTIPLIER`
  - `peekLimit(db: Db, key: string, limit: number, windowSeconds: number, now?: Date): Promise<boolean>`: no increment
  - Fixed window: `windowStart = floor(now / windowSeconds) * windowSeconds`, via upsert `ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1 RETURNING count`.
- **crypto.ts:**
  - `hashIp(ip: string | null): string` (hex SHA-256 of `BETTER_AUTH_SECRET + ':' + ip`; `'unknown'` for null)
  - `getClientIp(headers: Headers): string | null` (first `x-forwarded-for` entry, then `x-real-ip`)
  - `signValue(value: string, ttlSeconds: number, now?: Date): string` (`value.expEpoch.hmacB64url`)
  - `verifySignedValue(token: string, now?: Date): string | null` (`timingSafeEqual`)
- **turnstile.ts:**
  - `type TurnstileVerifier = (token: string, ip: string | null) => Promise<boolean>`
  - `createTurnstileVerifier(secret: string, fetchImpl?: typeof fetch): TurnstileVerifier` (POSTs form data to `https://challenges.cloudflare.com/turnstile/v0/siteverify`)
  - `verifyTurnstile: TurnstileVerifier` (the default, using env secret)

- [ ] **Step 1: Write the failing tests**

```ts
// rate-limit (PGlite)
for (let i = 1; i <= 5; i++) expect((await hitLimit(db, 'k', 5, 3600, now)).allowed).toBe(true);
expect(await hitLimit(db, 'k', 5, 3600, now)).toEqual({ allowed: false, count: 6 });
expect((await hitLimit(db, 'other', 5, 3600, now)).allowed).toBe(true);
expect((await hitLimit(db, 'k', 5, 3600, new Date(now.getTime() + 3600_000))).allowed).toBe(true);
expect(await peekLimit(db, 'p', 1, 60, now)).toBe(true); expect(await peekLimit(db, 'p', 1, 60, now)).toBe(true);
// crypto
const tok = signValue('order-1', 60, now);
expect(verifySignedValue(tok, now)).toBe('order-1');
expect(verifySignedValue(tok.replace(/.$/, c => (c === 'A' ? 'B' : 'A')), now)).toBeNull();
expect(verifySignedValue(tok, new Date(now.getTime() + 61_000))).toBeNull();
expect(hashIp('1.2.3.4')).toMatch(/^[0-9a-f]{64}$/); expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'));
expect(getClientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4');
expect(getClientIp(new Headers())).toBeNull();
// turnstile
const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));
expect(await createTurnstileVerifier('s', f)('tok', '1.2.3.4')).toBe(true);
expect(await createTurnstileVerifier('s', f)('', null)).toBe(false); expect(f).toHaveBeenCalledTimes(1);
expect(await createTurnstileVerifier('s', vi.fn().mockRejectedValue(new Error('net')))('tok', null)).toBe(false);
```

- [ ] **Step 2: Run** the three test files. Expected: FAIL.
- [ ] **Step 3: Implement** the three modules.
- [ ] **Step 4: Run** the same tests. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
G add -A && G commit -m "feat(security): Postgres rate limiter, signed values, IP hashing, Turnstile verifier"
```

---

### Task 5: Read models (catalog, settings, reviews) and storefront cache layer

**Files:**
- Create: `src/lib/cart-schema.ts`, `src/server/catalog.ts`, `src/server/settings.ts`, `src/server/reviews.ts`, `src/server/next/cache.ts`, `src/server/next/storefront-data.ts`
- Test: `tests/integration/catalog.test.ts`, `tests/integration/settings-reviews.test.ts`, `tests/helpers/fixtures.ts`

**Interfaces:**
- All view types are JSON-safe: no `Date`; timestamps are ISO strings.
- **Shared types:**
  - `type L10n = { en: string; ar: string }` (exported from `src/lib/cart-schema.ts`, client-safe)
- **`src/lib/cart-schema.ts`** (client-safe, shared by server and cart store):
  - `cartLineSchema = z.object({ bundleId: z.uuid(), quantity: z.int().min(1).max(10) })`
  - `cartSchema = z.array(cartLineSchema).min(1).max(10)`
  - `type CartLine = z.infer<typeof cartLineSchema>`
- **catalog.ts types:**
  - `BundleView = { id; name: L10n; subtitle: L10n; units; priceCents; compareAtCents: number | null; badge: 'none'|'most_popular'|'best_value'; imageUrl: string | null; isDefault; savePercent: number | null; perUnitCents }`
  - `ProductView = { id; slug; name: L10n; tagline: L10n; description: L10n; seoTitle: L10n; seoDescription: L10n; images: { url; alt: L10n; width; height }[]; bundles: BundleView[]; stockUnits; inStock: boolean }`
  - `QuotedLine = { bundleId; productId; productName: L10n; bundleName: L10n; units; quantity; unitPriceCents; lineTotalCents; imageUrl: string | null }`
  - `CartQuote = { lines: QuotedLine[]; removed: string[]; subtotalCents: number }`
- **catalog.ts functions:**
  - `getFeaturedProduct(db): Promise<ProductView | null>`: first active product by `sortOrder`
  - `getProductBySlug(db, slug): Promise<ProductView | null>`: active products only
  - `listActiveProducts(db): Promise<ProductView[]>`
  - `quoteCart(db, lines: CartLine[]): Promise<CartQuote>`:
    - merges duplicate bundleIds and clamps quantity to 1–10;
    - puts unknown ids, inactive bundles and non-active products into `removed`;
    - adds products whose stock is below the requested units to `removed` too.
- **settings.ts:**
  - `type StoreSettings = { storeName; contactPhone: string | null; contactEmail: string | null; social: { instagram?; facebook?; tiktok? }; announcement: L10n; announcementEnabled; deliveryFeeCents; freeDeliveryThresholdCents: number | null; deliveryTime: L10n; trustpilotUrl: string | null }`
  - `getSettings(db): Promise<StoreSettings>`
  - `deliveryFeeFor(s: StoreSettings, subtotalAfterDiscountCents: number): number`
- **reviews.ts:**
  - `type ReviewView = { id; authorName; rating; body; locale; photoUrl: string | null; reviewDate: string }`
  - `getReviewSummary(db, productId): Promise<{ count: number; average: number; distribution: Record<1|2|3|4|5, number> }>` (average rounded to 1 decimal; 0 when there are none)
  - `listVisibleReviews(db, productId, opts: { limit: number; offset: number }): Promise<ReviewView[]>` (newest `reviewDate` first)
- **next/cache.ts:**
  - `TAGS = { catalog: 'catalog', settings: 'settings', reviews: 'reviews' } as const`
  - `type Tag`
  - `cached<A extends unknown[], R>(fn: (...a: A) => Promise<R>, key: string[], tags: Tag[]): (...a: A) => Promise<R>` (wraps `unstable_cache`)
  - `invalidate(...tags: Tag[]): void` (calls `updateTag` for each; if `updateTag` doesn't expire `unstable_cache` entries in this Next version, use `revalidateTag(tag, { expire: 0 })`)
- **next/storefront-data.ts:** cached wrappers bound to `getDb()`:
  - `getFeaturedProductCached`, `getProductBySlugCached`, `listActiveProductsCached` (tag `catalog`)
  - `getSettingsCached` (tag `settings`)
  - `getReviewSummaryCached`, `listVisibleReviewsCached` (tag `reviews`)
- **tests/helpers/fixtures.ts:** `seeded(db)` = `seedSettings` + `seedCatalog`; returns `seedCatalog`'s ids.

- [ ] **Step 1: Write the failing tests** (key assertions)

```ts
const { productId, bundleIds: b } = await seeded(db);
const p = (await getFeaturedProduct(db))!;
expect(p.bundles.map(x => [x.savePercent, x.perUnitCents])).toEqual([[33,2000],[40,1800],[43,1700],[50,1500]]);
expect(p.images).toHaveLength(4); expect(p.inStock).toBe(true);
expect(JSON.parse(JSON.stringify(p))).toEqual(p);                                   // JSON-safe
await db.update(bundles).set({ active: false }).where(eq(bundles.id, b.triple));
expect((await getProductBySlug(db, 'ibada-one'))!.bundles).toHaveLength(3);
await db.update(products).set({ status: 'draft' }).where(eq(products.id, productId));
expect(await getProductBySlug(db, 'ibada-one')).toBeNull(); expect(await listActiveProducts(db)).toEqual([]);
// quoteCart (fresh db)
const q = await quoteCart(db, [{ bundleId: b.double, quantity: 1 }, { bundleId: b.double, quantity: 20 },
  { bundleId: crypto.randomUUID(), quantity: 1 }]);
expect(q.lines).toMatchObject([{ bundleId: b.double, quantity: 10, unitPriceCents: 3600, lineTotalCents: 36000 }]);
expect(q.removed).toHaveLength(1); expect(q.subtotalCents).toBe(36000);
// stale cart: bundle deactivated since it was added
await db.update(bundles).set({ active: false }).where(eq(bundles.id, b.single));
expect((await quoteCart(db, [{ bundleId: b.single, quantity: 1 }])).removed).toEqual([b.single]);
// settings + delivery
const s = await getSettings(db);
expect(deliveryFeeFor(s, 3600)).toBe(0);
expect(deliveryFeeFor({ ...s, deliveryFeeCents: 300 }, 3600)).toBe(300);
expect(deliveryFeeFor({ ...s, deliveryFeeCents: 300, freeDeliveryThresholdCents: 5000 }, 5000)).toBe(0);
expect(deliveryFeeFor({ ...s, deliveryFeeCents: 300, freeDeliveryThresholdCents: 5000 }, 4999)).toBe(300);
// reviews
expect(await getReviewSummary(db, productId)).toMatchObject({ count: 0, average: 0 });
// insert visible ratings 5,4,4 and one hidden 1
expect(await getReviewSummary(db, productId)).toEqual({ count: 3, average: 4.3, distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 } });
```

- [ ] **Step 2: Run** `npx vitest run tests/integration/catalog.test.ts tests/integration/settings-reviews.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `catalog.ts`, `settings.ts` and `reviews.ts`, then the two `next/` files (not unit-tested; covered by E2E).
- [ ] **Step 4: Run** the same tests. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
G add -A && G commit -m "feat(catalog): product, settings and review read models with cache layer"
```

---

### Task 6: Discounts and order totals

**Files:**
- Create: `src/server/discounts.ts`
- Test: `tests/integration/discounts.test.ts`

**Interfaces:**
- Consumes: `Db`, `StoreSettings`, `deliveryFeeFor`.
- Produces:
  - `normalizeCode(code: string): string` (trim + uppercase)
  - `type DiscountReason = 'not_found'|'inactive'|'not_started'|'expired'|'min_subtotal'|'usage_limit'|'already_used'`
  - `evaluateDiscount(db, a: { code: string; subtotalCents: number; phone: string | null; now: Date }): Promise<{ ok: true; discountId: string; code: string; amountCents: number } | { ok: false; reason: DiscountReason }>`
    - percent: `Math.round(subtotal * value / 100)`
    - fixed: `min(value, subtotal)`
    - `once_per_phone` is checked only when `phone` isn't null
  - `computeTotals(a: { subtotalCents: number; discountCents: number; settings: StoreSettings }): { subtotalCents; discountCents; deliveryCents; totalCents }` (delivery from `deliveryFeeFor(settings, subtotal − discount)`)

- [ ] **Step 1: Write the failing tests**

```ts
// insert discounts: WELCOME10 percent 10; FIVE fixed 500; BIG fixed 5000; MIN50 percent 10 min 5000;
// ONCE percent 10 usage_limit 1 used_count 1; OFF percent 10 inactive; LATER starts tomorrow; OLD ended yesterday;
// PERPHONE percent 10 once_per_phone + redemption for '+9613123456'
expect(normalizeCode('  welcome10 ')).toBe('WELCOME10');
expect(await evaluateDiscount(db, { code: ' welcome10', subtotalCents: 3600, phone: null, now }))
  .toMatchObject({ ok: true, code: 'WELCOME10', amountCents: 360 });
expect((await evaluateDiscount(db, { code: 'FIVE', subtotalCents: 3600, phone: null, now }) as any).amountCents).toBe(500);
expect((await evaluateDiscount(db, { code: 'BIG', subtotalCents: 3600, phone: null, now }) as any).amountCents).toBe(3600);
for (const [code, reason] of [['NOPE','not_found'],['OFF','inactive'],['LATER','not_started'],['OLD','expired'],
  ['MIN50','min_subtotal'],['ONCE','usage_limit']] as const)
  expect(await evaluateDiscount(db, { code, subtotalCents: 3600, phone: null, now })).toEqual({ ok: false, reason });
expect(await evaluateDiscount(db, { code: 'PERPHONE', subtotalCents: 3600, phone: '+9613123456', now })).toEqual({ ok: false, reason: 'already_used' });
expect((await evaluateDiscount(db, { code: 'PERPHONE', subtotalCents: 3600, phone: '+96170123456', now })).ok).toBe(true);
const s = await getSettings(db);
expect(computeTotals({ subtotalCents: 3600, discountCents: 360, settings: s })).toEqual({ subtotalCents: 3600, discountCents: 360, deliveryCents: 0, totalCents: 3240 });
expect(computeTotals({ subtotalCents: 3600, discountCents: 360, settings: { ...s, deliveryFeeCents: 300, freeDeliveryThresholdCents: 3500 } }).totalCents).toBe(3540);
```

- [ ] **Step 2: Run** `npx vitest run tests/integration/discounts.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `discounts.ts`. Look codes up with `upper(code) = normalizeCode(input)`.
- [ ] **Step 4: Run** the same test. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
G add -A && G commit -m "feat(discounts): code evaluation and order totals"
```

---

### Task 7: Place order

**Files:**
- Create: `src/server/orders/schema.ts`, `src/server/orders/place-order.ts`, `src/server/customers.ts`
- Test: `tests/integration/place-order.test.ts`

**Interfaces:**
- Consumes:
  - Tasks 3–6: `normalizeLebanesePhone`, `isValidDistrict`, `districtName`, `hitLimit`, `hashIp`, `TurnstileVerifier`, `cartSchema`, `L10n`, `quoteCart`, `evaluateDiscount`, `computeTotals`, `getSettings`
- Produces, `placeOrderSchema` (Zod object; unknown keys stripped):

  | Field | Type | Rule |
  |---|---|---|
  | `idempotencyKey` | uuid | required |
  | `locale` | `'en'` \| `'ar'` | required |
  | `cart` | `cartSchema` | required |
  | `name` | string | 2–80 chars |
  | `phone` | string | transformed with `normalizeLebanesePhone`; null → issue `phone` |
  | `governorate` | string | one of the governorates |
  | `district` | string | must satisfy `isValidDistrict`; otherwise issue `district` |
  | `town` | string | 2–60 chars |
  | `addressLine` | string | 5–200 chars |
  | `landmark` | string | optional, ≤ 120 chars |
  | `notes` | string | optional, ≤ 300 chars |
  | `discountCode` | string | optional, ≤ 32 chars |
  | `turnstileToken` | string | required |

  All strings are trimmed.
- Produces, types:
  - `type NewOrderNotice = { id: string; number: number; items: { bundleName: string; quantity: number }[]; totalCents: number; district: string }` (English names)
  - `type PlaceOrderContext = { ip: string | null; sessionId: string | null; now: Date; verifyTurnstile: TurnstileVerifier; notify: (n: NewOrderNotice) => Promise<void> }`
  - `type PlaceOrderError = 'invalid'|'captcha'|'rate_limited'|'blocked'|'cart_changed'|'out_of_stock'|'discount_invalid'`
- Produces, function:
  - `placeOrder(db, input: unknown, ctx: PlaceOrderContext): Promise<{ ok: true; orderId: string; orderNumber: number; duplicate: boolean; stockCrossedZero: boolean } | { ok: false; error: PlaceOrderError; fieldErrors?: Record<string, string>; productName?: L10n; discountReason?: DiscountReason }>`
- Produces, customers helper:
  - `upsertCustomerForOrder(db, a: { phone: string; name: string; now: Date }): Promise<{ id: string; blocked: boolean }>`
  - Unblocked customers get `orderCount + 1`, `lastOrderAt = now` and the new name.
- Algorithm: exactly spec §6 steps 1–8.
  - **Rate-limit keys:** `order:ip:<hash>` (5 per 3600 s) and `order:phone:<e164>` (3 per 86400 s).
  - **Blocked check:** runs before the transaction via `customers.blocked`. The upsert happens inside the transaction.
  - **`cart_changed`:** returned when `quoteCart` puts any bundle id in `removed`. The client never sends prices, so a re-priced bundle is simply charged at its current price, which the checkout summary already shows.
  - **Stock:** a conditional `UPDATE … WHERE stock_units >= $n RETURNING stock_units` per product. Zero rows → throw an internal `OutOfStock` that rolls back and maps to `out_of_stock`.
  - **`stockCrossedZero`:** true when any product's returned stock is 0.
  - **Events:** write an `order_placed` event when `sessionId` is set.
  - **Notify:** call `notify` after commit inside `try/catch` (log and swallow).

- [ ] **Step 1: Write the failing tests** (one `it` each; `ctx` = `{ ip: '1.1.1.1', sessionId: 's1', now, verifyTurnstile: async () => true, notify: vi.fn() }`, `valid` = Multi-Room ×1, phone `03 123 456`, governorate `beirut`, district `beirut`)

```ts
it('places an order', async () => {
  const r = await placeOrder(db, valid(), ctx);
  expect(r).toMatchObject({ ok: true, orderNumber: 1001, duplicate: false, stockCrossedZero: false });
  const [o] = await db.select().from(orders);
  expect(o).toMatchObject({ status: 'new', paymentStatus: 'pending', subtotalCents: 3600, discountCents: 0, deliveryCents: 0, totalCents: 3600, phone: '+9613123456' });
  expect((await db.select().from(products))[0].stockUnits).toBe(98);
  expect(await db.select().from(inventoryMovements).where(eq(inventoryMovements.reason, 'order'))).toMatchObject([{ deltaUnits: -2 }]);
  expect(await db.select().from(customers)).toMatchObject([{ phone: '+9613123456', orderCount: 1 }]);
  expect(await db.select().from(orderEvents)).toMatchObject([{ type: 'created' }]);
  expect(await db.select().from(events)).toMatchObject([{ type: 'order_placed', sessionId: 's1' }]);
  expect(ctx.notify).toHaveBeenCalledWith(expect.objectContaining({ number: 1001, totalCents: 3600, district: 'Beirut',
    items: [{ bundleName: 'Multi-Room Protection', quantity: 1 }] }));
});
it('is idempotent', …)            // same key twice → 2nd { ok:true, duplicate:true, orderNumber:1001 }; 1 order; verifyTurnstile ×1; notify ×1
it('ignores client-sent prices', …) // cart line { bundleId, quantity:1, priceCents:1 } → totalCents 3600
it('rejects out of stock atomically', …) // stock 3, Full Home → { ok:false, error:'out_of_stock', productName:{ en:'IBADA ONE' } }; stock 3; 0 orders; 0 customers
it('never oversells under concurrency', …) // stock 4, two parallel Family Pack orders (different keys/phones) → exactly one ok; stock 1
it('reports stock crossing zero', …) // stock 2, Multi-Room → stockCrossedZero true
it('rejects a failed captcha', …)  // verifyTurnstile → false → 'captcha'; nothing written
it('rate-limits by phone and IP', …) // 3 ok then 4th same phone 'rate_limited'; 5 ok from one IP (different phones) then 6th 'rate_limited'
it('rejects blocked phones', …)    // customer blocked → 'blocked'; 0 orders
it('validates fields', …)          // phone '01 123 456' → { error:'invalid', fieldErrors:{ phone } }; beirut/tripoli → fieldErrors.district; 11 cart lines → 'invalid'
it('reports a changed cart', …)    // bundle deactivated → 'cart_changed'
it('applies discounts', …)         // WELCOME10 → discount 360, total 3240, used_count 1, 1 redemption; 'NOPE' → { error:'discount_invalid', discountReason:'not_found' };
                                   // PERPHONE twice same phone → 2nd discountReason 'already_used'
it('survives a failing notifier', …) // notify rejects → still ok
it('charges the delivery fee setting', …) // deliveryFeeCents 300 → total 3900
```

- [ ] **Step 2: Run** `npx vitest run tests/integration/place-order.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `orders/schema.ts`, `customers.ts` and `orders/place-order.ts`.
- [ ] **Step 4: Run** the same test. Expected: PASS (14 tests).
- [ ] **Step 5: Commit**

```bash
G add -A && G commit -m "feat(orders): transactional, idempotent cash-on-delivery order placement"
```

---

### Task 8: Order management: status machine, notes, tracking, admin queries, CSV

**Files:**
- Create: `src/server/orders/manage.ts`, `src/server/orders/admin-query.ts`, `src/server/orders/csv.ts`
- Test: `tests/integration/order-manage.test.ts`, `tests/integration/order-query.test.ts`, `tests/unit/csv.test.ts`

**Interfaces:**
- Consumes: `canTransition`, `normalizeLebanesePhone`, `formatBeirut`, `placeOrder` (tests create orders with it).
- **Status changes:**
  - `changeOrderStatus(db, a: { orderId: string; to: OrderStatus; userId: string | null; note?: string; now: Date }): Promise<{ ok: true; stockCrossedZero: boolean } | { ok: false; error: 'not_found' | 'invalid_transition' | 'conflict' }>`
    - Runs in one transaction.
    - `UPDATE orders SET status = to WHERE id = ? AND status = from`. Zero rows → `conflict`.
    - Side effects as spec §6. `stockCrossedZero` is true when a restock moves a product from 0 to above 0.
  - `bulkChangeStatus(db, a: { orderIds: string[]; to: OrderStatus; userId: string; now: Date }): Promise<{ updated: number; skipped: number }>`
- **Notes:** `addOrderNote(db, a: { orderId; userId; note: string /* 1–1000 */ }): Promise<void>`
- **Tracking:**
  - `type TrackView = { number; status: OrderStatus; createdAt: string; items: { bundleName: L10n; quantity: number }[]; totalCents; timeline: { status: OrderStatus; at: string }[] }` (no notes, no address)
  - `trackOrder(db, a: { number: number; phone: string }): Promise<TrackView | null>`
  - `getOrderForConfirmation(db, orderId): Promise<(TrackView & { id: string; name: string; district: string }) | null>`
- **admin-query.ts:**
  - `listOrders(db, f: { status?: OrderStatus; q?: string; from?: Date; to?: Date; page: number }): Promise<{ rows: OrderRow[]; total: number }>`
    - 25 per page, newest first.
    - `q` matches: an exact number when numeric and 4–6 digits; phone digits (via `normalizeLebanesePhone(q)` when it parses); `name ILIKE %q%`.
  - `OrderRow = { id; number; createdAt: string; status; name; phone; district; totalCents; itemsSummary: string }` (`itemsSummary`, e.g. `Multi-Room Protection ×1`)
  - `getOrderDetail(db, id): Promise<OrderDetail | null>`: order, items, events (with user name), customer `{ id, orderCount, blocked }`
  - `getOrdersForExport(db, f): Promise<OrderExportRow[]>`: same filters, no paging, max 5000
- **csv.ts:**
  - `ordersToCsv(rows: OrderExportRow[]): string`
    - Header row: `Order,Date,Status,Name,Phone,Governorate,District,Town,Address,Landmark,Notes,Items,Total USD`
    - CRLF line ends and RFC 4180 quoting.
    - Cells starting with `= + - @` are prefixed with `'`.
    - Dates via `formatBeirut(…, 'datetime')`; totals as `36.00`.

- [ ] **Step 1: Write the failing tests** (key assertions)

```ts
it('walks the happy path and records events', …) // new→confirmed→out_for_delivery→delivered: paymentStatus 'paid', customer.totalSpentCents 3600, 4 events
it('rejects invalid transitions', …)             // new→delivered → { ok:false, error:'invalid_transition' }
it('cancel restocks, releases discount, decrements order count', …) // WELCOME10 order, cancel: stock back to 100, movement 'cancel' +2,
                                                                     // discounts.usedCount 0, 0 redemptions, customer.orderCount 0
it('return restocks and reverses spend but stays paid', …)          // delivered→returned: stock 100, movement 'return', totalSpentCents 0, paymentStatus 'paid'
it('restores stock exactly once when two admins cancel at once', async () => {
  const rs = await Promise.all([changeOrderStatus(db, cancel), changeOrderStatus(db, cancel)]);
  expect(rs.filter(r => r.ok)).toHaveLength(1);
  expect(rs.find(r => !r.ok)).toEqual({ ok: false, error: 'conflict' });
  expect(await db.select().from(inventoryMovements).where(eq(inventoryMovements.reason, 'cancel'))).toHaveLength(1);
});
it('reports restock from zero', …)               // stock hits 0 on order; cancel → stockCrossedZero true
it('bulk changes only valid orders', …)          // [new,new,delivered] → confirmed → { updated:2, skipped:1 }
it('tracks by number and any phone format, hiding notes', async () => {
  await addOrderNote(db, { orderId, userId, note: 'SECRET-NOTE' });
  const v = await trackOrder(db, { number: 1001, phone: '٠٣ ١٢٣ ٤٥٦' });
  expect(v).toMatchObject({ number: 1001, status: 'new' }); expect(JSON.stringify(v)).not.toContain('SECRET-NOTE');
  expect(await trackOrder(db, { number: 1001, phone: '70 123 456' })).toBeNull();
});
// order-query: search by '1001', '3123456', 'ali' (case-insensitive name); status filter; 30 orders → page 2 has 5 rows, total 30
// csv
expect(ordersToCsv([row]).split('\r\n')[0]).toBe('Order,Date,Status,Name,Phone,Governorate,District,Town,Address,Landmark,Notes,Items,Total USD');
expect(ordersToCsv([{ ...row, name: '=HYPERLINK("x")', address: 'Bldg 5, floor 2' }])).toContain(`"'=HYPERLINK(""x"")"`);
expect(ordersToCsv([row])).toContain('"Bldg 5, floor 2"'); expect(ordersToCsv([row])).toContain(',36.00');
```

- [ ] **Step 2: Run** the three test files. Expected: FAIL.
- [ ] **Step 3: Implement** `manage.ts`, `admin-query.ts` and `csv.ts`.
- [ ] **Step 4: Run** the same tests. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
G add -A && G commit -m "feat(orders): status machine with restock, tracking, admin queries and CSV export"
```

---

### Task 9: Push notifications domain

**Files:**
- Create: `src/server/push.ts`
- Test: `tests/integration/push.test.ts`

**Interfaces:**
- Consumes: `Db`, `NewOrderNotice`, `formatUsd`.
- Produces, types:
  - `type PushPayload = { title: string; body: string; url: string; tag: string }`
  - `type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } }`
  - `type PushSender = (sub: PushSubscriptionInput, payload: string) => Promise<{ statusCode: number }>`
- Produces, functions:
  - `newOrderPayload(n: NewOrderNotice): PushPayload`
  - `saveSubscription(db, userId: string, sub: PushSubscriptionInput, userAgent: string | null): Promise<void>` (upsert by endpoint; reassigns the owner)
  - `removeSubscription(db, userId: string, endpoint: string): Promise<void>` (own subscriptions only)
  - `listSubscriptions(db, userId): Promise<{ endpoint; userAgent; createdAt: string; lastSuccessAt: string | null }[]>`
  - `notifyAdmins(db, payload: PushPayload, send?: PushSender): Promise<{ sent: number; removed: number; failed: number }>`
    - Sends only to subscriptions of users with `active = true`.
    - 404/410 → delete the subscription. Thrown errors count as `failed`.
    - A successful send sets `lastSuccessAt`.
  - `webPushSender: PushSender` (`web-push` with VAPID keys from env, TTL 3600, urgency `high`)
  - `sendToUser(db, userId, payload, send?)`: same rules, one user only (the "send test" button)

- [ ] **Step 1: Write the failing tests**

```ts
expect(newOrderPayload({ id: 'o1', number: 1042, items: [{ bundleName: 'Multi-Room Protection', quantity: 1 }], totalCents: 3600, district: 'Beirut' }))
  .toEqual({ title: '🛒 New order #1042', body: 'Multi-Room Protection ×1 · $36 · Beirut', url: '/admin/orders/o1', tag: 'order-o1' });
// users: owner (active), staff (active), exStaff (active=false); subs: a (owner), b (staff, sender → 410), c (exStaff)
const send = vi.fn(async (s) => ({ statusCode: s.endpoint === 'b' ? 410 : 201 }));
expect(await notifyAdmins(db, payload, send)).toEqual({ sent: 1, removed: 1, failed: 0 });
expect(send.mock.calls.map(c => c[0].endpoint).sort()).toEqual(['a', 'b']);
expect((await db.select().from(pushSubscriptions)).map(s => s.endpoint).sort()).toEqual(['a', 'c']);
expect(await notifyAdmins(db, payload, vi.fn().mockRejectedValue(new Error('x')))).toMatchObject({ failed: 1 });
await saveSubscription(db, staffId, subA, 'UA'); // reassigns endpoint 'a' to staff
await removeSubscription(db, ownerId, 'a');       // not owner's any more → no-op
expect(await listSubscriptions(db, staffId)).toHaveLength(2);
```

- [ ] **Step 2: Run** `npx vitest run tests/integration/push.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `push.ts`. Build `webPushSender` lazily so tests never need VAPID keys.
- [ ] **Step 4: Run** the same test. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
G add -A && G commit -m "feat(push): admin order notifications with dead-subscription cleanup"
```

---

### Task 10: Storefront shell: i18n, proxy, layouts, brand, assets, E2E harness

**Files:**
- Create i18n: `src/i18n/{routing,request,navigation}.ts`, `messages/en.json`, `messages/ar.json`
- Create proxy and layouts: `src/proxy.ts`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/not-found.tsx`, `src/app/global-not-found.tsx`
- Create components: `src/components/brand/{logo,logo-mark}.tsx`, `src/components/shop/{header,footer,announcement-bar,language-switcher}.tsx`
- Complete `scripts/prepare-assets.ts`: `src/app/icon.png` (from `assets/source/logo-icon.png`, trimmed, 512 px), `src/app/apple-icon.png` (180 px on white), `public/admin/icons/icon-192.png`, `icon-512.png`, `maskable-512.png` (logo at 60% on navy `#012755`)
- Create E2E harness: `playwright.config.ts`, `scripts/e2e-serve.ts`, `scripts/e2e-fixtures.ts`, `tests/e2e/shell.spec.ts`, `tests/unit/messages.test.ts`

**Interfaces:**
- Consumes: `getSettingsCached`.
- Produces:
  - `routing = defineRouting({ locales: ['en','ar'], defaultLocale: 'en', localePrefix: 'always' })`
  - `Link`, `redirect`, `usePathname`, `useRouter` from `src/i18n/navigation.ts`
  - `type Locale = 'en' | 'ar'`
  - `<Logo className? />`: inline SVG wordmark
  - `<LogoMark className? />`: inline SVG roof + dot
  - `<ShopHeader />`, `<ShopFooter />`, `<AnnouncementBar />` (server components; cart button slot filled in Task 12)
- E2E harness:
  - `scripts/e2e-serve.ts`:
    1. Deletes `.data/pg-e2e` and starts embedded-postgres on port 54330.
    2. Creates DB `ibada_e2e`, migrates, seeds, and runs `e2eFixtures(db)`.
    3. Runs `next build`, then `next start -p 3100`.
    4. Sets env: `APP_ENV=test`, `RATE_LIMIT_MULTIPLIER=100`, `SITE_URL=http://localhost:3100`, Turnstile test keys, and fresh VAPID keys from `webpush.generateVAPIDKeys()`.
  - `playwright.config.ts`:
    - `webServer.command: 'npx tsx scripts/e2e-serve.ts'`, `url: 'http://localhost:3100/en'`, `timeout: 600_000`
    - `workers: 1`, `fullyParallel: false`
    - Projects:
      - `setup` (`testMatch: /.*\.setup\.ts/`; Task 14 adds `admin.setup.ts`)
      - `mobile` (Pixel 7) and `desktop` (Desktop Chrome), both with `dependencies: ['setup']`
  - Every run starts from a fresh database, so the admin login is redone by the `setup` project each run.
  - Both device projects share one database. Specs that create unique records (discount codes, invite emails, reviews) suffix them with `test.info().project.name`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/messages.test.ts — both locales define exactly the same keys
const keys = (o: object, p = ''): string[] => Object.entries(o).flatMap(([k, v]) => typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`]);
expect(keys(ar).sort()).toEqual(keys(en).sort());
// tests/e2e/shell.spec.ts
test('root redirects to /en', async ({ page }) => { await page.goto('/'); await expect(page).toHaveURL(/\/en$/); });
test('arabic is rtl', async ({ page }) => {
  await page.goto('/ar'); await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});
test('language switch keeps the path', async ({ page }) => {
  await page.goto('/en/shop'); await page.getByTestId('lang-switch').click(); await expect(page).toHaveURL(/\/ar\/shop$/);
});
test('announcement bar and logo render', async ({ page }) => {
  await page.goto('/en'); await expect(page.getByText('Cash on delivery').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'IBADA home' })).toBeVisible();
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/messages.test.ts`. Expected: FAIL (messages missing).
- [ ] **Step 3: i18n setup.**
  - Implement `routing`, `request.ts` (loads `messages/<locale>.json`) and `navigation.ts`.
  - `src/proxy.ts`:
    - `/admin/**` → `NextResponse.next()` for now (Task 14 adds the gate).
    - Everything else → `createMiddleware(routing)`.
    - Matcher: `['/((?!api|_next|_vercel|.*\\..*).*)']`.
- [ ] **Step 4: Locale layout** in `[locale]/layout.tsx`:
  - `generateStaticParams` returns both locales; call `setRequestLocale`.
  - `<html lang dir>` with font variables `--font-jakarta` / `--font-plex-arabic`. The body uses `font-arabic` when `ar`.
  - Wrap in `NextIntlClientProvider`, then announcement bar, header, `{children}`, footer.
  - Base `metadata` (title template `%s · IBADA`, `metadataBase` = `SITE_URL`).
- [ ] **Step 5: Brand SVGs.**
  - Wordmark: 5 glyphs on a 0 0 600 120 viewBox in navy.
    - `I`: rect; `B` and `D`: stroked paths with 14 px strokes.
    - Each `A`: an open roof chevron (two 14 px strokes meeting at the apex) with a blue `#0693E6` circle, r=9, centered 60% down inside it.
  - Compare against `assets/source/logo-word.png`. If it doesn't read as the same logo at 32 px tall, use `next/image` of a trimmed transparent `logo-word.webp` from `prepare-assets.ts` instead.
  - `aria-label="IBADA"`; the header link gets `aria-label="IBADA home"`.
- [ ] **Step 6: Header, footer, announcement and switcher.**
  - Header:
    - Sticky and white, `backdrop-blur`, bottom hairline.
    - Nav anchors `#how-it-works` and `#reviews`, plus a `/shop` link. Nav collapses into a `Sheet` menu below `md`.
    - Language switcher (`data-testid="lang-switch"`) shows `عربي` on EN and `English` on AR.
  - Footer:
    - Navy background: logo in white, contact info from settings, policy links, social icons, "💵 Cash on delivery all over Lebanon", copyright.
- [ ] **Step 7: Messages.** Write `en.json` + `ar.json` with namespaces `common, header, footer, hero, bundles, purchase, steps, pests, comparison, reviews, faq, cart, checkout, thankYou, track, contact, policies, errors, seo`.
  - Every later task adds its keys to both files. Arabic is natural Modern Standard Arabic suited to a Lebanese audience.
  - EN copy is fixed by the concept deck and packaging:
    - **hero:**
      - `headline` "PEST FREE LIVING"; `subheadline` "One device. A calmer home."
      - `benefits`: "Up to 50m² coverage" / "24/7 continuous protection" / "No chemicals. No odor." / "Safe for kids & pets" / "Plug in & forget"
    - **purchase:** `addToCart` "ADD TO CART"; `guarantee` "60-day money back guarantee"
    - **steps:**
      - `title` "Easy to use"
      - step 1 "Plug IBADA into a socket in the room you want to protect"
      - step 2 "Sit back — IBADA works 24/7, silently and chemical-free"
    - **pests:**
      - `title` "Effective against 40+ common house pests"
      - items: Cockroaches, Rodents, Bed bugs, Spiders, Mosquitoes, Flies, Ants, Fleas, Termites
    - **comparison:**
      - `title` "IBADA vs other pesticide solutions"
      - IBADA column: "One solution for all" / "Easy setup. Plug in & forget" / "No chemicals. No odors" / "Safe for family & pets"
      - Others column: "Only targets one kind of pest" / "Constant renewal & hassle" / "Filled with harmful substances" / "Might harm or kill pets"
    - **AR tagline** (from the packaging): `بلا تعب، بلا حشرات، بلا إزعاج`
- [ ] **Step 8: Run** `npm run assets && npx vitest run tests/unit/messages.test.ts && npx playwright install chromium && npx playwright test tests/e2e/shell.spec.ts`. Expected: PASS. The first run builds the app, which takes a few minutes.
- [ ] **Step 9: Commit**

```bash
G add -A && G commit -m "feat(shop): bilingual RTL-aware shell, brand logo, assets pipeline and E2E harness"
```

---

### Task 11: Product page, shop page and SEO

**Files:**
- Create pages: `src/app/[locale]/(shop)/page.tsx` (featured product), `products/[slug]/page.tsx`, `shop/page.tsx`
- Create product components in `src/components/shop/product/`:
  - `product-template.tsx` (server): assembles the sections
  - `selection-context.tsx` (client provider of the selected bundle)
  - `gallery.tsx`, `bundle-picker.tsx`, `purchase-panel.tsx`, `sticky-bar.tsx`
  - `rating-summary.tsx`, `benefits.tsx`, `steps.tsx`, `pests.tsx`, `pest-icons.tsx`, `comparison.tsx`, `reviews-section.tsx`, `faq.tsx`
- Create SEO: `src/server/seo.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/[locale]/opengraph-image.tsx`
- Create stub: `src/lib/track.ts`: `type FunnelEventType = 'view_product' | 'add_to_cart' | 'begin_checkout'`; `track(type: FunnelEventType): void` (a no-op here; Task 12 implements it)
- Test: `tests/unit/seo.test.ts`, `tests/e2e/product.spec.ts`

**Interfaces:**
- Consumes: `ProductView`, `getFeaturedProductCached`, `getProductBySlugCached`, `listActiveProductsCached`, `getReviewSummaryCached`, `listVisibleReviewsCached`, `getSettingsCached`, `formatUsd`.
- Produces:
  - `productJsonLd(p: ProductView, a: { locale: Locale; url: string; rating: { count: number; average: number } }): object`
  - `jsonLdScript(obj: object): string` (`JSON.stringify` with `<` → `\u003c`)
  - `useSelectedBundle(): { bundle: BundleView; select(id: string): void; quantity: number; setQuantity(n: number): void }`
  - `<AddToCartButton />` calls `addToCart(bundleId, quantity)` from Task 12. Until Task 12 exists, it's a no-op prop, `onAdd`, passed in.

- [ ] **Step 1: Write the failing tests**

```ts
// seo
const ld = productJsonLd(p, { locale: 'en', url: 'https://ibadashop.com/en', rating: { count: 0, average: 0 } }) as any;
expect(ld.offers).toMatchObject({ '@type': 'AggregateOffer', priceCurrency: 'USD', lowPrice: '20.00', highPrice: '60.00', offerCount: 4,
  availability: 'https://schema.org/InStock' });
expect(ld.aggregateRating).toBeUndefined();
expect((productJsonLd(p, { ...a, rating: { count: 3, average: 4.3 } }) as any).aggregateRating).toMatchObject({ ratingValue: 4.3, reviewCount: 3 });
expect(jsonLdScript({ name: '</script><script>x' })).not.toContain('</script>');
// e2e product.spec.ts
test('bundle picker drives price', async ({ page }) => {
  await page.goto('/en');
  const radios = page.getByRole('radio'); await expect(radios).toHaveCount(4);
  await expect(page.getByRole('radio', { name: /Multi-Room Protection/ })).toBeChecked();
  const price = page.getByTestId('price-block');
  await expect(price).toContainText('$36'); await expect(price).toContainText('$60'); await expect(price).toContainText('Save 40%');
  await page.getByRole('radio', { name: /Family Pack/ }).check();
  await expect(price).toContainText('$51'); await expect(price).toContainText('Save 43%');
  await expect(page.getByRole('radio', { name: /Family Pack/ })).toContainText('$17 / unit');
  await expect(page.getByTestId('rating-summary')).toHaveCount(0);            // no reviews yet
});
test('sticky bar appears after scrolling past the button', …) // scroll to #how-it-works → getByTestId('sticky-atc') visible
test('arabic product page', …)                               // /ar shows 'باقة العائلة' and dir rtl
test('seo files', …)                                         // /sitemap.xml contains /en and /ar URLs; /robots.txt disallows /admin
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/seo.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `seo.ts`.** Then build the product template in section order from spec §5, with these visual rules:
  - **Hero:**
    - Two columns from `lg` (gallery on the left in LTR, mirrored in RTL via logical properties); stacked on mobile with the gallery first.
    - Background: a soft radial ice-blue gradient.
    - Headline: `bg-gradient-to-r from-navy to-blue bg-clip-text text-transparent`, font weight 800, tracking tight.
  - **Gallery:**
    - Embla carousel, `next/image` with `priority` on the first image, `sizes="(min-width:1024px) 50vw, 100vw"`.
    - Thumbnails row, prev/next buttons from `md`, swipe on mobile.
    - Selecting a bundle scrolls to that bundle's image.
  - **Bundle picker:**
    - A `role="radiogroup"` of cards with a hidden `<input type="radio">` each.
    - Selected card: navy 2 px border and ice background.
    - Badge ribbon on top (MOST POPULAR in blue, BEST VALUE in navy).
    - Each card shows a thumbnail, name, subtitle, `$X / unit`, price, struck compare-at and a `Save N%` pill.
    - On mobile, cards are full width in a single column.
  - **Price block** (`data-testid="price-block"`): price in navy at 32 px, compare-at in grey with a line-through, blue pill.
  - **Purchase panel:** delivery line with a truck icon, quantity stepper (1–10), full-width navy button (56 px tall, rounded), guarantee line with a shield-check icon.
  - **Sticky bar** (`data-testid="sticky-atc"`): an `IntersectionObserver` on the main button. The bar is fixed to the bottom on mobile and the top on desktop, and shows thumbnail, name, price and the button.
  - **Pest icons:** 9 simple line SVGs (24 px, stroke 1.75, `currentColor`) in blue tiles.
  - **Comparison:** two columns. The IBADA column has a navy header and blue ticks; "Others" has a grey header and red-500 crosses. On mobile it stays two columns with 14 px text.
  - **Reviews:** hidden entirely when `count === 0`. Otherwise it shows the summary (average, stars, distribution bars), then cards, then "Load more" (client fetch via a server action returning the next 6).
  - **Rating summary:** shown in the hero only when `count > 0`. It links to `settings.trustpilotUrl` when set; otherwise it anchors to `#reviews`.
  - **FAQ:** accessible accordion with `<details>`. Questions and answers are in messages (spec §5 topics):
    - Is it safe for kids and pets?
    - How much area does one device cover? (50m², one per room — ultrasound doesn't pass through walls)
    - How long until I notice a difference? (gradual; keep it plugged in continuously)
    - How do I pay? (cash on delivery)
    - How long is delivery?
    - What if it doesn't work for me? (60-day money-back)
    - What voltage? (220V, indoor use)
  - **Pages:**
    - `page.tsx` (home) renders the featured product.
    - `products/[slug]` uses `generateStaticParams` over active products with `dynamicParams = true` and `notFound()` for unknown slugs.
    - `shop` shows a card grid.
    - `generateMetadata` sets localized SEO title, description, alternates and hreflang; the JSON-LD script is rendered via `jsonLdScript`.
    - `sitemap.ts` / `robots.ts` follow spec §5 SEO.
  - **Funnel:** `selection-context` calls `track('view_product')` on mount (the stub from this task, made real in Task 12).
- [ ] **Step 4: Run** `npx vitest run tests/unit/seo.test.ts && npx playwright test tests/e2e/product.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
G add -A && G commit -m "feat(shop): product landing page with bundle picker, sticky cart bar and SEO"
```

---

### Task 12: Cart and funnel events

**Files:**
- Create: `src/lib/cart-store.ts` (framework-free store), `src/components/shop/cart/{cart-provider,cart-drawer,cart-button}.tsx`, `src/app/[locale]/(shop)/actions.ts` (`quoteCartAction`)
- Create: `src/server/analytics.ts` (`recordEvent` only; Task 20 extends it), `src/app/api/events/route.ts`, `src/server/next/request.ts` (`requestIp()`, `requestSessionId()`)
- Modify: `src/lib/track.ts` (replace the Task 11 stub)
- Test: `tests/unit/cart-store.test.ts`, `tests/integration/analytics-events.test.ts`, `tests/e2e/cart.spec.ts`

**Interfaces:**
- Consumes: `cartSchema`, `quoteCart`, `getSettings`, `deliveryFeeFor`, `hitLimit`, `hashIp`.
- **cart-store.ts:**
  - `STORAGE_KEY = 'ibada_cart_v1'`
  - `parseCart(raw: string | null): CartLine[]`: invalid JSON or entries are dropped; duplicates merged; quantity clamped to 1–10; at most 10 lines
  - `createCartStore(storage: Pick<Storage, 'getItem' | 'setItem'>)` returns `{ getLines(): CartLine[]; subscribe(fn): () => void; add(bundleId, qty): void; setQuantity(bundleId, qty): void; remove(bundleId): void; replace(lines): void; clear(): void }`
- **Provider and actions:**
  - `useCart()` returns `{ lines; count; open: boolean; setOpen(b); addToCart(bundleId, qty) }`
    - `addToCart` opens the drawer and fires `track('add_to_cart')`.
  - `quoteCartAction(lines: unknown): Promise<CartQuote & { deliveryCents: number; totalCents: number }>`
    - Invalid input → empty quote.
    - When `removed` is non-empty, the client calls `replace(quote.lines)` and shows `cart.itemsRemoved`: "Some items are no longer available and were removed from your cart."
- **Events:**
  - `recordEvent(db, e: { type: 'view_product' | 'add_to_cart' | 'begin_checkout' | 'order_placed'; sessionId: string; locale: Locale; now?: Date }): Promise<void>`
  - `POST /api/events` with body `{ type, locale }`: sets `ibada_sid` if missing (random UUID, `HttpOnly`, `SameSite=Lax`, `Secure` in production, 1 year); rate-limited by `events:ip:<hash>` (300 per 3600 s); `order_placed` is rejected (server-only); returns 204.
  - `track(type): void`: `navigator.sendBeacon('/api/events', …)`

- [ ] **Step 1: Write the failing tests**

```ts
// cart-store
expect(parseCart('nope')).toEqual([]);
expect(parseCart(JSON.stringify([{ bundleId: U1, quantity: 2 }, { bundleId: U1, quantity: 20 }, { bundleId: 'x', quantity: 1 }])))
  .toEqual([{ bundleId: U1, quantity: 10 }]);
const mem = new Map<string, string>(); const s = createCartStore({ getItem: k => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) });
s.add(U1, 1); s.add(U1, 2); expect(s.getLines()).toEqual([{ bundleId: U1, quantity: 3 }]);
expect(JSON.parse(mem.get('ibada_cart_v1')!)).toEqual([{ bundleId: U1, quantity: 3 }]);
s.setQuantity(U1, 0); expect(s.getLines()).toEqual([]);
// analytics-events
await recordEvent(db, { type: 'add_to_cart', sessionId: 's', locale: 'ar' });
expect(await db.select().from(events)).toMatchObject([{ type: 'add_to_cart', sessionId: 's', locale: 'ar' }]);
// e2e cart.spec.ts
test('add, change, remove, persist', …) // add Family Pack → drawer shows 'Family Pack', subtotal '$51', delivery 'FREE';
                                         // + → '$102'; reload → still '$102'; remove → 'Your cart is empty'
test('stale cart is repaired', async ({ page }) => {
  await page.goto('/en');
  await page.evaluate(() => localStorage.setItem('ibada_cart_v1', JSON.stringify([{ bundleId: '00000000-0000-4000-8000-000000000000', quantity: 1 }])));
  await page.reload(); await page.getByTestId('cart-button').click();
  await expect(page.getByText('Some items are no longer available')).toBeVisible();
  await expect(page.getByText('Your cart is empty')).toBeVisible();
});
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/cart-store.test.ts tests/integration/analytics-events.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the store, provider and drawer.
  - Drawer: a `Sheet` sliding from the inline end (the right in LTR, the left in RTL).
  - Lines show thumbnail, bundle name, product name, a quantity stepper and remove.
  - Footer: subtotal, delivery ("FREE" in blue or the fee), total and a navy "Checkout" link to `/{locale}/checkout`.
  - Also build the action, route, `track`, and the header cart button with a count badge (`data-testid="cart-button"`). Wire the Task 11 `onAdd` to `addToCart`.
- [ ] **Step 4: Run** the unit + integration tests, then `npx playwright test tests/e2e/cart.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
G add -A && G commit -m "feat(shop): persistent cart drawer with server quotes and funnel events"
```

---

### Task 13: Checkout, confirmation, track order, contact and policies

**Files:**
- Create pages: `src/app/[locale]/(shop)/checkout/{page,checkout-form}.tsx`, `order/[number]/page.tsx`, `track/{page,track-form}.tsx`, `contact/page.tsx`, `policies/[slug]/page.tsx`
- Create shared pieces: `src/components/shop/turnstile.tsx`, `src/server/next/order-cookie.ts`, `src/content/policies.ts`
- Modify: `src/app/[locale]/(shop)/actions.ts` (add `placeOrderAction`, `applyDiscountAction`, `trackOrderAction`), `scripts/e2e-fixtures.ts` (discount `WELCOME10`, 10%)
- Test: `tests/e2e/checkout.spec.ts`

**Interfaces:**
- Consumes: `placeOrder`, `placeOrderSchema`, `evaluateDiscount`, `computeTotals`, `trackOrder`, `getOrderForConfirmation`, `notifyAdmins`, `newOrderPayload`, `webPushSender`, `verifyTurnstile`, `invalidate`, `signValue`, `verifySignedValue`, `GOVERNORATES`, `useCart`.
- **Actions:**
  - `placeOrderAction(input: unknown): Promise<{ ok: false; error: PlaceOrderError; fieldErrors?; productName?; discountReason? }>`
    - On success: `invalidate('catalog')` if `stockCrossedZero`, set the order cookie, `redirect('/{locale}/order/{number}')`.
    - `notify` = `n => notifyAdmins(getDb(), newOrderPayload(n)).then(() => {})`
  - `applyDiscountAction(a: { code: string; lines: CartLine[] }): Promise<{ ok: true; code; discountCents; deliveryCents; totalCents } | { ok: false; reason: DiscountReason | 'rate_limited' }>` (`discount:ip:<hash>`, 20 per 600 s)
  - `trackOrderAction(a: { number: string; phone: string; turnstileToken: string }): Promise<{ ok: true; order: TrackView } | { ok: false; error: 'not_found' | 'captcha' | 'rate_limited' }>` (`track:ip:<hash>`, 10 per 600 s)
- **order-cookie.ts:**
  - `setOrderCookie(orderId: string)`: `ibada_order` = `signValue(orderId, 3600)`, `HttpOnly`, `Path=/`, `SameSite=Lax`
  - `readOrderCookie(): string | null`
- **Turnstile component:** `<Turnstile siteKey onToken(token) onExpire() />` loads `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` once, uses `appearance: 'interaction-only'`, and passes the language as `ar` or `en`.
- **policies.ts:** `POLICIES: Record<'shipping'|'returns'|'privacy'|'terms', Record<Locale, { title: string; updated: '2026-09-27'; sections: { heading: string; paragraphs: string[] }[] }>>`

- [ ] **Step 1: Write the failing E2E tests**

```ts
test('english purchase on mobile', async ({ page }) => {
  await page.goto('/en'); await page.getByRole('button', { name: 'ADD TO CART' }).first().click();
  await page.getByRole('link', { name: 'Checkout' }).click(); await expect(page).toHaveURL(/\/en\/checkout$/);
  await page.getByLabel('Full name').fill('Ali Haddad'); await page.getByLabel('Phone').fill('03 123 456');
  await page.getByLabel('Governorate').selectOption('mount-lebanon'); await page.getByLabel('District').selectOption('metn');
  await page.getByLabel('Town / city').fill('Jdeideh'); await page.getByLabel('Address details').fill('Main st, Bldg 5, 2nd floor');
  await expect(page.getByTestId('summary-delivery')).toHaveText('FREE');
  await expect(page.getByTestId('summary-payment')).toContainText('Cash on delivery');
  await page.getByRole('button', { name: 'PLACE ORDER' }).click();
  await expect(page).toHaveURL(/\/en\/order\/10\d\d$/); await expect(page.getByText(/#10\d\d/)).toBeVisible();
  await expect(page.getByText(/call you to confirm/i)).toBeVisible();
});
test('arabic purchase is rtl end to end', …)           // /ar flow via data-testid selectors; order page has dir rtl and Arabic thank-you title
test('discount code', …)                              // WELCOME10 on Multi-Room → summary-discount '-$3.60', summary-total '$32.40'
test('invalid phone shows a field error', …)          // '01 123 456' → 'Enter a valid Lebanese mobile number'
test('confirmation page is private', …)               // new browser context → /en/order/1001 redirects to /en/track
test('track order by number and phone', …)            // uses the number from the first test; phone '03123456' → status 'Order received'
test('policies and contact render in both languages', …)
```

- [ ] **Step 2: Run** `npx playwright test tests/e2e/checkout.spec.ts`. Expected: FAIL (pages missing).
- [ ] **Step 3: Checkout page.**
  - **Layout:** form on the left and summary on the right (inline start/end) from `lg`. On mobile the summary collapses to the top ("Show order summary · $36").
  - **Fields:** labels as in the tests, with Arabic equivalents; `inputmode="tel"` and `autocomplete` attributes. The district select is filtered by the governorate. Field errors come from `fieldErrors`.
  - **Behavior:**
    - `idempotencyKey` = `crypto.randomUUID()` on mount; `begin_checkout` event on mount.
    - The button is disabled while submitting and until a Turnstile token exists.
    - On the `captcha` error, reset the widget.
    - On `cart_changed`, re-quote and show a notice. On `out_of_stock`, name the product.
  - **Cart:** it's cleared only after the redirect lands. The confirmation page renders `<ClearCart />`.
- [ ] **Step 4: Confirmation page.**
  - `order/[number]` is dynamic. It reads the cookie; if it's missing or doesn't match, it redirects to `/{locale}/track`.
  - It shows a check animation, "Thank you, {name}!", the order number, items and total, then "We'll call you to confirm your order before delivery." and "Pay {total} in cash when it arrives."
- [ ] **Step 5: Track, contact and policies.**
  - Track page: number + phone form, Turnstile, and a status timeline with the localized status labels:

    | Status | EN | AR |
    |---|---|---|
    | `new` | Order received | تم استلام الطلب |
    | `confirmed` | Confirmed | تم التأكيد |
    | `out_for_delivery` | Out for delivery | قيد التوصيل |
    | `delivered` | Delivered | تم التسليم |
    | `cancelled` | Cancelled | ملغى |
    | `returned` | Returned | مُرتجع |

  - Contact page: phone (`tel:`), email and social links from settings. When a phone is set, it also shows a WhatsApp click-to-chat link `https://wa.me/<digits>`.
  - Policy pages: from `POLICIES`, with a "Draft — please review" banner rendered only when `APP_ENV !== 'production'`. The starter copy covers:
    - free delivery all over Lebanon in 2–4 business days, cash on delivery;
    - the 60-day money-back guarantee;
    - what's collected (name, phone, address; no card data) and the anonymous session cookie.
- [ ] **Step 6: Run** `npx playwright test tests/e2e/checkout.spec.ts`. Expected: PASS.
- [ ] **Step 7: Commit**

```bash
G add -A && G commit -m "feat(shop): cash-on-delivery checkout, private confirmation, order tracking, policies"
```

---

### Task 14: Admin authentication (Better Auth, owner CLI, invites, 2FA, gate, login limits, audit)

**Files:**
- Create server modules: `src/server/auth/{auth,users,invites,authorize}.ts`, `src/server/audit.ts`, `src/server/next/admin-session.ts`
- Create routes and client: `src/app/api/auth/[...all]/route.ts`, `src/lib/auth-client.ts`
- Create admin layout and auth pages: `src/app/admin/layout.tsx` (own `<html lang="en">`, Jakarta font, `sonner` Toaster), `src/app/admin/(auth)/{login,two-factor,setup-2fa,invite/[token]}/page.tsx`, `src/app/admin/forbidden.tsx`
- Create CLI: `scripts/create-owner.ts`
- Modify: `src/proxy.ts` (admin gate), `scripts/e2e-fixtures.ts` (owner `owner@ibada.test` with password `e2e-owner-password-123`, no 2FA yet)
- Test: `tests/integration/auth.test.ts`, `tests/unit/authorize.test.ts`, `tests/e2e/admin.setup.ts`, `tests/e2e/admin-auth.spec.ts`

**Interfaces:**
- Consumes: `Db`, `hitLimit`, `peekLimit`, `hashIp`, `getClientIp`, `can`, `Area`, `StaffRole`.
- **auth.ts:**
  - `createAuth(db: Db)` (factory for tests) and `auth` (= `createAuth(getDb())`, lazily created)
  - Config:
    - `drizzleAdapter(db, { provider: 'pg', schema: authSchema })`
    - `emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 10, revokeSessionsOnPasswordReset: true }`
    - `user.additionalFields: { role: { type: 'string', input: false, defaultValue: 'staff' }, active: { type: 'boolean', input: false, defaultValue: true } }`
    - `session: { expiresIn: 60*60*24*7, updateAge: 60*60*24 }`
    - `plugins: [twoFactor({ issuer: 'IBADA Admin' }), nextCookies()]`
  - Login-limit hooks:
    - `hooks.before` on `/sign-in/email`, `/two-factor/verify-totp`, `/two-factor/verify-backup-code`: refuse with `APIError('TOO_MANY_REQUESTS')` when `peekLimit` on `login:acct:<email-or-userId>` (5 per 900 s) or `login:ip:<hash>` (20 per 900 s) is exhausted.
    - `hooks.after` records a failure (`hitLimit` on both keys) when the endpoint returned an error.
- **users.ts:**
  - `createStaffUser(auth, a: { email; name; password; role: StaffRole }): Promise<{ id: string }>`
    - Uses `(await auth.$context).password.hash` + `internalAdapter.createUser` + `internalAdapter.linkAccount({ providerId: 'credential', accountId: userId, password })`.
    - Throws `'email_taken'`.
  - `createOwnerIfNone(auth, db, a): Promise<{ id }>` throws `'owner_exists'`.
- **invites.ts:**
  - `createInvite(db, a: { email; role; invitedBy; now }): Promise<{ token: string; expiresAt: Date }>` (72 h; stores the sha256 of the token)
  - `acceptInvite(db, auth, a: { token; name; password; now }): Promise<{ ok: true; userId } | { ok: false; error: 'invalid' | 'expired' | 'used' | 'email_taken' }>`
- **authorize.ts:**
  - `type AuthzUser = { id; role: StaffRole; active: boolean; twoFactorEnabled: boolean } | null`
  - `authorize(u: AuthzUser, area: Area): 'ok' | 'login' | 'setup-2fa' | 'forbidden'`
- **admin-session.ts:**
  - `requireAdmin(area: Area): Promise<{ user: { id; email; name; role: StaffRole } }>`
    - Reads the session via `auth.api.getSession({ headers: await headers() })`.
    - Maps `authorize()`: `login` → `redirect('/admin/login')`, `setup-2fa` → `redirect('/admin/setup-2fa')`, `forbidden` → `forbidden()`.
  - `requireSignedIn(): Promise<{ user }>` (setup-2fa page only)
- **audit.ts:** `audit(db, e: { userId: string | null; action: string; entity: string; entityId?: string; summary: string; ip: string | null }): Promise<void>`
- **proxy.ts:** `/admin/**`, except `/admin/login`, `/admin/two-factor`, `/admin/invite/*`, `/admin/sw.js` and `/admin/manifest.webmanifest`, redirects to `/admin/login` when `getSessionCookie(request)` is absent. This is the optimistic check only.
- **create-owner.ts:** `npm run admin:create-owner -- --email <e> --name <n>` prompts for the password twice (hidden input) and prints "Owner created. Sign in at <SITE_URL>/admin and set up your authenticator app."

- [ ] **Step 1: Write the failing tests**

```ts
// authorize (unit)
const u = { id: 'u', role: 'staff', active: true, twoFactorEnabled: true } as const;
expect(authorize(null, 'orders')).toBe('login');
expect(authorize({ ...u, active: false }, 'orders')).toBe('login');          // deactivated mid-session
expect(authorize({ ...u, twoFactorEnabled: false }, 'orders')).toBe('setup-2fa');
expect(authorize(u, 'settings')).toBe('forbidden'); expect(authorize({ ...u, role: 'owner' }, 'settings')).toBe('ok');
// auth (PGlite + createAuth)
it('signs in created staff and blocks public sign-up', …) // createStaffUser → signInEmail ok; wrong password → throws; auth.api.signUpEmail → throws
it('locks an account after 5 failures', async () => {
  for (let i = 0; i < 5; i++) await expect(signIn('owner@x.test', 'wrong-password!')).rejects.toThrow();
  await expect(signIn('owner@x.test', 'right-password-123')).rejects.toMatchObject({ statusCode: 429 });
  await expect(signIn('other@x.test', 'right-password-123')).resolves.toBeTruthy(); // other account, same IP (6 < 20)
});
it('owner bootstrap runs once', …)  // createOwnerIfNone twice → 2nd rejects 'owner_exists'
it('invites', …)                    // token ≠ stored hash; accept → user role 'staff'; reuse → 'used';
                                    // new invite accepted at now+73h → 'expired'; invite for existing email → 'email_taken'
it('audit writes a row', …)
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/authorize.test.ts tests/integration/auth.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the server side.** Server modules, route handler (`toNextJsHandler(auth)`), and the auth client (`createAuthClient({ plugins: [twoFactorClient({ onTwoFactorRedirect: () => location.assign('/admin/two-factor') })] })`).
  - Run `npx @better-auth/cli generate --config src/server/auth/auth.ts --output .data/auth-schema-check.ts` and confirm it matches `auth-schema.ts`. Fix any drift with a new migration.
- [ ] **Step 4: Build the admin auth pages.**
  - Shared look: centered card on an ice background with the logo.
  - **Login:** email + password, error text, "Too many attempts, try again in 15 minutes" for 429.
  - **Two-factor:** a 6-digit input (`autocomplete="one-time-code"`, auto-submit on 6 digits), with a "Use a backup code" toggle.
  - **Setup-2fa:**
    1. Re-enter the password → `twoFactor.enable`.
    2. Show a QR code (`qrcode` → SVG) and the base32 secret in `data-testid="totp-secret"`.
    3. Enter the code → `twoFactor.verifyTotp`.
    4. Show the 10 backup codes, with "Copy" and "I saved them" buttons → `/admin`.
  - **Invite/[token]:** name + password + confirm → `acceptInvite` → login.
  - **Forbidden:** "You don't have access to this page."
- [ ] **Step 5: Write the E2E tests.**
  - `tests/e2e/admin.setup.ts`, the enrollment test that also produces login state:
    1. The owner logs in and lands on `/admin/setup-2fa`, enters the password, reads the secret, and enters `new OTPAuth.TOTP({ secret }).generate()`.
    2. The backup codes are visible; after "I saved them" the URL is `/admin`.
    3. Save the secret to `.data/e2e-owner-totp.txt` and `storageState` to `.data/e2e-owner.json`.
    4. When the secret file already exists from an earlier project in the same run, log in with TOTP instead of enrolling.
  - `tests/e2e/admin-auth.spec.ts`:
    1. `/admin/orders` redirects to `/admin/login` without a session.
    2. Log in with password → `/admin/two-factor` → enter the code from the saved secret → `/admin`.
  - All later admin specs use `test.use({ storageState: '.data/e2e-owner.json' })`.
- [ ] **Step 6: Run** `npx vitest run tests/unit/authorize.test.ts tests/integration/auth.test.ts && npx playwright test tests/e2e/admin-auth.spec.ts`. Expected: PASS; the `setup` project runs first automatically.
- [ ] **Step 7: Commit**

```bash
G add -A && G commit -m "feat(admin): Better Auth login with mandatory TOTP, invites, owner CLI and login limits"
```

---

### Task 15: Admin shell, installable PWA, notifications and account pages

**Files:**
- Create layout and nav: `src/app/admin/(dashboard)/layout.tsx`, `src/components/admin/{nav,sidebar,bottom-tabs,page-header,install-hint,push-toggle}.tsx`, `src/components/admin/nav-items.ts`
- Create PWA: `src/app/admin/manifest.webmanifest/route.ts`, `public/admin/sw.js`
- Create pages and actions: `src/app/admin/(dashboard)/notifications/{page,actions}.tsx`, `src/app/admin/(dashboard)/account/page.tsx`, `src/app/admin/(dashboard)/page.tsx` (placeholder "Home" until Task 20)
- Modify: `next.config.ts`: headers for `/admin/sw.js` (`Cache-Control: no-cache`, `Content-Type: application/javascript`)
- Test: `tests/unit/nav-items.test.ts`, `tests/e2e/admin-shell.spec.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `can`, `saveSubscription`, `removeSubscription`, `listSubscriptions`, `sendToUser`, `webPushSender`, `auth` (change password, revoke sessions, list sessions), `getEnv().VAPID_PUBLIC_KEY`.
- **nav-items.ts:**
  - `type NavItem = { href: string; label: string; icon: LucideIcon; area: Area; mobile: 'tab' | 'more' }`
  - `navItemsFor(role: StaffRole): NavItem[]`
  - Order:
    - Tabs: Home `/admin`, Orders, Products, Customers
    - More: Inventory, Discounts, Reviews, Settings, Staff, Activity, Notifications, Account
- **Notification actions:**
  - `subscribeAction(sub: PushSubscriptionInput): Promise<void>`
  - `unsubscribeAction(endpoint: string): Promise<void>`
  - `sendTestAction(): Promise<{ sent: number }>` (payload `{ title: 'IBADA', body: 'Notifications are working ✅', url: '/admin', tag: 'test' }`)
- **Manifest:**
  - `{ name: 'IBADA Admin', short_name: 'IBADA', start_url: '/admin', scope: '/admin/', display: 'standalone', background_color: '#FFFFFF', theme_color: '#012755', icons: [192, 512, maskable 512] }`
- **Service worker** (`public/admin/sw.js`):
  - `push` → `showNotification(title, { body, tag, icon: '/admin/icons/icon-192.png', badge: '/admin/icons/icon-192.png', data: { url } })`
  - `notificationclick` → focus an existing `/admin` client and navigate it to `data.url`, or `clients.openWindow(data.url)`

- [ ] **Step 1: Write the failing tests**

```ts
// nav-items
expect(navItemsFor('staff').map(i => i.area)).not.toEqual(expect.arrayContaining(['discounts']));
expect(navItemsFor('staff').map(i => i.area)).toEqual(['home','orders','products','customers','inventory','reviews','notifications','account']);
expect(navItemsFor('owner')).toHaveLength(12);
expect(navItemsFor('owner').filter(i => i.mobile === 'tab').map(i => i.href)).toEqual(['/admin','/admin/orders','/admin/products','/admin/customers']);
// e2e admin-shell (owner storageState)
test('manifest', async ({ request }) => {
  const m = await (await request.get('/admin/manifest.webmanifest')).json();
  expect(m).toMatchObject({ scope: '/admin/', start_url: '/admin', display: 'standalone', theme_color: '#012755' });
});
test('service worker is served', …)      // GET /admin/sw.js → 200, body contains "addEventListener('push'"
test('mobile shows bottom tabs, desktop shows sidebar', …)
test('notifications page offers enabling on this device', …) // button 'Enable notifications on this device' visible
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/nav-items.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the shell.**
  - **Desktop sidebar:** 248 px wide, white, logo at the top, grouped links with lucide icons, and the user menu at the bottom (name, role, Account, Log out).
  - **Top bar:** page title plus an actions slot.
  - **Mobile:** a fixed bottom bar with 5 icon+label tabs (the four tabs + "More" opening a `Sheet` with the remaining items). Content gets bottom padding and the bar uses `env(safe-area-inset-bottom)`.
  - **Layout** calls `requireAdmin('home')` and links the manifest via `metadata.manifest` and `appleWebApp: { capable: true, title: 'IBADA', statusBarStyle: 'default' }`.
  - **install-hint:** shown when `navigator.standalone` is false on iOS Safari. It says "Install: tap Share → Add to Home Screen, then open IBADA from your home screen to enable notifications." and can be dismissed (stored in `localStorage`).
  - **push-toggle:**
    1. Register the SW with scope `/admin/`.
    2. `Notification.requestPermission()`.
    3. `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, then `subscribeAction`.
    4. Show states: unsupported / denied (explain how to re-enable) / enabled on this device.
    5. Offer a "Send test notification" button.
    6. List the devices with "Remove".
  - **Account page:**
    - Change password (current + new + confirm; revokes other sessions).
    - Regenerate backup codes.
    - List active sessions with "Sign out other devices".
- [ ] **Step 4: Run** `npx vitest run tests/unit/nav-items.test.ts && npx playwright test tests/e2e/admin-shell.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
G add -A && G commit -m "feat(admin): responsive shell, installable PWA with push opt-in, account page"
```

---

### Task 16: Admin orders

**Files:**
- Create pages and routes: `src/app/admin/(dashboard)/orders/{page,actions}.tsx`, `orders/[id]/page.tsx`, `orders/print/page.tsx`, `orders/export/route.ts`
- Create components: `src/components/admin/orders/{orders-table,status-badge,status-actions,order-timeline,note-form,bulk-bar,delivery-slip}.tsx`
- Test: `tests/e2e/admin-orders.spec.ts`

**Interfaces:**
- Consumes: `requireAdmin('orders')`, `listOrders`, `getOrderDetail`, `getOrdersForExport`, `ordersToCsv`, `changeOrderStatus`, `bulkChangeStatus`, `addOrderNote`, `nextStatuses`, `audit`, `invalidate`, `formatBeirut`, `formatUsd`, `formatLebanesePhone`.
- Actions (each: `requireAdmin('orders')` → Zod → domain → `audit` → `revalidatePath('/admin/orders')` → `invalidate('catalog')` when `stockCrossedZero`):
  - `changeStatusAction(a: { orderId: string; to: OrderStatus; note?: string }): Promise<{ ok: boolean; error? }>`
  - `bulkStatusAction(a: { orderIds: string[]; to: OrderStatus }): Promise<{ updated; skipped }>`
  - `addNoteAction(a: { orderId: string; note: string }): Promise<void>`
- Export route: `GET /admin/orders/export?status&q&from&to` → `requireAdmin('orders')` → CSV with `Content-Disposition: attachment; filename="ibada-orders-YYYY-MM-DD.csv"` and a UTF-8 BOM so Excel shows Arabic correctly.
- Print page: `/admin/orders/print?ids=a,b&format=a4|label`. It calls `window.print()` on load and uses `@page` CSS: A4 = 2 slips per page; label = 100×150 mm.

- [ ] **Step 1: Write the failing E2E test** (owner `storageState`; places an order through the storefront in `beforeAll`)

```ts
test('new order is listed and can be confirmed', async ({ page }) => {
  await page.goto('/admin/orders'); await page.getByRole('tab', { name: /New/ }).click();
  const row = page.getByRole('row', { name: /E2E Buyer/ }).first(); await expect(row).toContainText('$36');
  await row.click(); await page.getByRole('button', { name: 'Confirm order' }).click();
  await expect(page.getByTestId('order-status')).toHaveText('Confirmed');
  await expect(page.getByTestId('timeline')).toContainText('New → Confirmed');
  await page.getByLabel('Add a note').fill('Called, confirmed for tomorrow'); await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByTestId('timeline')).toContainText('Called, confirmed for tomorrow');
});
test('cancel asks for confirmation', …)     // 'Cancel order' → alert dialog → confirm → status 'Cancelled'
test('bulk mark out for delivery', …)       // select 2 confirmed rows → bulk bar 'Out for delivery' → '2 orders updated'
test('search by phone', …)                  // q '03 123 456' shows only matching rows
test('print slip shows COD amount', …)      // print page contains 'COD amount: $36.00' and the landmark
test('csv export', …)                       // download → first line equals the Task 8 header (after BOM)
```

- [ ] **Step 2: Run** `npx playwright test tests/e2e/admin-orders.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the list.**
  - Status tabs with counts (All / New / Confirmed / Out for delivery / Delivered / Cancelled / Returned).
  - Search input (debounced, stored in the URL `searchParams`), date range popover, pagination.
  - The table shows checkbox, #, date (Beirut), customer, district, items, total and a status badge. On mobile, rows become cards.
  - Badge colors: new = blue, confirmed = indigo, out_for_delivery = amber, delivered = green, cancelled = slate, returned = rose.
- [ ] **Step 4: Implement the detail page.**
  - Header: `#1001`, badge, Beirut date.
  - Items card with totals, including "COD to collect".
  - Customer card:
    - tap-to-call `tel:` link;
    - "N previous orders" link;
    - "Blocked" warning when blocked.
  - Address card with a copy button.
  - Status actions: only the `nextStatuses`; `cancelled`/`returned` use an alert dialog.
  - Note form, then the timeline (actor name or "Customer" / "System").
- [ ] **Step 5: Run** the same E2E test. Expected: PASS.
- [ ] **Step 6: Commit**

```bash
G add -A && G commit -m "feat(admin): orders list, detail, status workflow, bulk actions, slips and CSV"
```

---

### Task 17: Admin products, images, bundles and inventory

**Files:**
- Create server: `src/server/admin/products.ts`, `src/server/images.ts`, `src/server/storage/{index,local,supabase}.ts`
- Create pages: `src/app/admin/(dashboard)/products/{page,actions}.tsx`, `products/new/page.tsx`, `products/[id]/page.tsx`, `inventory/{page,actions}.tsx`
- Create components: `src/components/admin/products/{product-form,media-manager,bundles-editor,stock-card}.tsx`
- Modify: `next.config.ts`: `images.remotePatterns` for the `SUPABASE_URL` host at `/storage/v1/object/public/**`
- Test: `tests/integration/admin-products.test.ts`, `tests/unit/images.test.ts`, `tests/e2e/admin-products.spec.ts`

**Interfaces:**
- **storage:**
  - `interface Storage { put(key: string, data: Buffer, contentType: string): Promise<{ url: string }>; remove(url: string): Promise<void> }`
  - `getStorage(): Storage`
  - `local` writes `public/uploads/<key>` → `/uploads/<key>`
  - `supabase` uses a service-role client, bucket `SUPABASE_STORAGE_BUCKET`, upserts, and returns the public URL
- **images.ts:**
  - `processImage(input: Buffer): Promise<{ ok: true; data: Buffer; width: number; height: number } | { ok: false; error: 'too_large' | 'not_image' | 'unsupported' }>`
  - Rules: > 5 MB → `too_large`; format from `sharp(...).metadata()` must be jpeg/png/webp/avif; `.rotate().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 82 })`.
- **admin/products.ts, schemas:**
  - `productInputSchema`: `slug ^[a-z0-9-]{2,60}$`, EN/AR names 2–80, taglines ≤ 160, descriptions ≤ 4000, SEO title ≤ 70, SEO description ≤ 160, `status`, `lowStockThreshold` 0–10000
  - `bundleInputSchema`: EN/AR names 2–60, subtitles ≤ 80, `units` 1–20, `priceCents` 1–1,000,000, `compareAtCents` null or > price, `badge`, `imageId` nullable, `active`
- **admin/products.ts, functions:**
  - `saveProduct(db, a: { id?: string; input: unknown; userId: string }): Promise<{ ok: true; id } | { ok: false; error: 'invalid' | 'slug_taken'; fieldErrors? }>`
  - `saveBundle(db, a: { productId; id?; input: unknown }): Promise<…same shape…>`
  - `reorderBundles(db, productId, ids: string[])`
  - `setDefaultBundle(db, productId, bundleId)`
  - `addImage(db, a: { productId; url; width; height; altEn?; altAr? })`
  - `updateImageAlt`
  - `reorderImages(db, productId, ids: string[])`
  - `deleteImage(db, imageId): Promise<{ url: string }>` (unlinks bundles that used it)
  - `adjustStock(db, a: { productId; delta: number; note: string; userId: string }): Promise<{ ok: true; stockUnits: number; stockCrossedZero: boolean } | { ok: false; error: 'note_required' | 'negative_stock' }>` (`stockCrossedZero` is true when stock goes to 0 or up from 0)
  - `listMovements(db, productId, page)`
- Every product/bundle/image/stock action ends with `invalidate('catalog')`.

- [ ] **Step 1: Write the failing tests**

```ts
// images (unit)
const png = await sharp({ create: { width: 4000, height: 1000, channels: 3, background: '#fff' } }).png().toBuffer();
expect(await processImage(png)).toMatchObject({ ok: true, width: 2400, height: 600 });
expect(await processImage(Buffer.from('hello'))).toEqual({ ok: false, error: 'not_image' });
expect(await processImage(Buffer.alloc(5 * 1024 * 1024 + 1))).toEqual({ ok: false, error: 'too_large' });
// admin-products (integration)
expect(bundleInputSchema.safeParse({ ...b, priceCents: 2000, compareAtCents: 2000 }).success).toBe(false);
expect(bundleInputSchema.safeParse({ ...b, units: 0 }).success).toBe(false);
expect(await saveProduct(db, { input: { ...p, slug: 'ibada-one' }, userId })).toMatchObject({ ok: false, error: 'slug_taken' });
await setDefaultBundle(db, productId, bundleIds.full);
expect((await db.select().from(bundles).where(eq(bundles.isDefault, true))).map(x => x.id)).toEqual([bundleIds.full]);
expect(await adjustStock(db, { productId, delta: 10, note: '', userId })).toEqual({ ok: false, error: 'note_required' });
expect(await adjustStock(db, { productId, delta: -1000, note: 'count', userId })).toEqual({ ok: false, error: 'negative_stock' });
expect(await adjustStock(db, { productId, delta: -100, note: 'recount', userId })).toEqual({ ok: true, stockUnits: 0, stockCrossedZero: true });
// e2e admin-products
test('price edit shows on the storefront', async ({ page }) => {
  await page.goto('/admin/products'); await page.getByRole('link', { name: 'IBADA ONE' }).click();
  await page.getByTestId('bundle-row-Single Room Protection').getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Price (USD)').fill('22'); await page.getByRole('button', { name: 'Save bundle' }).click();
  await expect(page.getByText('Bundle saved')).toBeVisible();
  await page.goto('/en'); await page.getByRole('radio', { name: /Single Room/ }).check();
  await expect(page.getByTestId('price-block')).toContainText('$22'); await expect(page.getByTestId('price-block')).toContainText('Save 27%');
  // restore 20 at the end so later specs keep the pricing sheet
});
test('upload an image', …) // setInputFiles with a generated PNG → thumbnail appears in media manager
test('stock adjustment', …) // inventory page +10 with note → history row '+10 · manual'
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/images.test.ts tests/integration/admin-products.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement the server side.** `images.ts`, storage adapters, and `admin/products.ts`.
- [ ] **Step 4: Implement the pages.**
  - **Product list:** thumbnail, name, status badge, stock (red when ≤ threshold), bundle count.
  - **Product form:** sections as cards (Details with EN/AR tabs, Media, Bundles, Stock, SEO with EN/AR tabs, Status) and a sticky save bar.
  - **Media manager:**
    - Multi-file input with drag-and-drop zone.
    - The upload action accepts `FormData`, calls `processImage` and stores under `products/<uuid>.webp`.
    - Grid with ◀ ▶ reorder buttons, an alt-text dialog, and delete with confirm.
  - **Bundles editor:**
    - Rows with name, units, price, compare-at, a live "Save N% · $X/unit" preview, a badge select, an image picker from the product images, and a default radio.
    - ▲▼ reorder buttons.
    - Money inputs take dollars (`22`, `22.5`) and convert to cents on the server with `Math.round(x * 100)`.
  - **Inventory page:** stock per product, adjust dialog (± number + required note), movement history table.
- [ ] **Step 5: Run** the unit/integration tests and `npx playwright test tests/e2e/admin-products.spec.ts`. Expected: PASS.
- [ ] **Step 6: Commit**

```bash
G add -A && G commit -m "feat(admin): product, bundle, media and inventory management with safe image uploads"
```

---

### Task 18: Admin customers, discounts and reviews

**Files:**
- Create server: `src/server/admin/customers.ts`, plus admin functions added to `src/server/discounts.ts` and `src/server/reviews.ts`
- Create pages: `src/app/admin/(dashboard)/{customers,customers/[id],discounts,discounts/[id],reviews}/…` (pages + actions)
- Test: `tests/integration/admin-crm.test.ts`, `tests/e2e/admin-crm.spec.ts`

**Interfaces:**
- **admin/customers.ts:**
  - `listCustomers(db, f: { q?: string; sort: 'recent' | 'spent' | 'orders'; page: number }): Promise<{ rows; total }>`
  - `getCustomer(db, id)`: stats + orders
  - `setCustomerBlocked(db, a: { id; blocked: boolean; reason?: string })`
  - `setCustomerNotes(db, a: { id; notes: string /* ≤ 2000 */ })`
- **discounts.ts additions:**
  - `discountInputSchema`: `code` `^[A-Za-z0-9_-]{3,32}$` (stored with `normalizeCode`), `type`, `value` (percent 1–100 or fixed cents 1–1,000,000), `minSubtotalCents` ≥ 0 or null, `usageLimit` ≥ 1 or null, `oncePerPhone`, `startsAt` / `endsAt` (nullable; `endsAt > startsAt`), `active`
  - `saveDiscount(db, a: { id?; input: unknown }): Promise<{ ok: true; id } | { ok: false; error: 'invalid' | 'code_taken'; fieldErrors? }>`
  - `listDiscounts(db)` (with `usedCount`)
  - `setDiscountActive(db, id, active)`
- **reviews.ts additions:**
  - `reviewInputSchema`: `productId`, `authorName` 1–60, `rating` int 1–5, `body` 1–2000, `locale`, `reviewDate` (not in the future), `photoUrl` nullable, `visible`
  - `saveReview(db, a: { id?; input: unknown })`
  - `setReviewVisible(db, id, visible)`
  - `deleteReview(db, id)`
  - `listReviewsAdmin(db, f: { visible?: boolean; rating?: number; page })`
- Permissions: discount actions `requireAdmin('discounts')`; customers `('customers')`; reviews `('reviews')`. Review mutations call `invalidate('reviews')`.

- [ ] **Step 1: Write the failing tests**

```ts
it('search and sort customers', …)    // by '3123456' and by 'hadd' (name); sort 'spent' orders by totalSpentCents desc
it('blocking stops checkout', async () => {
  await setCustomerBlocked(db, { id, blocked: true, reason: 'fake orders' });
  expect(await placeOrder(db, valid(), ctx)).toMatchObject({ ok: false, error: 'blocked' });
});
it('validates discount codes', …)     // 'welcome 10' invalid; 'welcome10' saved as 'WELCOME10'; percent 0 and 101 invalid;
                                      // endsAt before startsAt invalid; duplicate (any case) → 'code_taken'
it('hidden reviews leave the summary', …) // 3 visible → count 3; setReviewVisible(false) on one → count 2; rating 6 invalid; future reviewDate invalid
```

- [ ] **Step 2: Run** `npx vitest run tests/integration/admin-crm.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the server functions and pages.
  - **Customers:** table plus a detail page with stat cards (orders, spent, last order), order list, notes, and a block toggle with a reason dialog.
  - **Discounts:** table (code, value, used/limit, dates, active switch) and a form.
  - **Reviews:** table with star display, a form with optional photo upload (reuses `processImage` + storage under `reviews/<uuid>.webp`), and a visibility switch.
- [ ] **Step 4: Write and run the E2E test**
  - Create discount `SUMMER15` (15%).
  - Add a visible 5-star review "Works great in our kitchen" → the storefront `/en` shows `rating-summary` with "5.0" and the review text.
  - Block a customer → their detail page shows the "Blocked" badge.

  Run: `npx playwright test tests/e2e/admin-crm.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
G add -A && G commit -m "feat(admin): customers with blocking, discount codes and review management"
```

---

### Task 19: Admin settings, staff and activity log

**Files:**
- Create server: `src/server/admin/staff.ts`, plus `updateSettings` added to `src/server/settings.ts`
- Create pages: `src/app/admin/(dashboard)/{settings,staff,activity}/…` (pages + actions)
- Test: `tests/integration/admin-staff-settings.test.ts`, `tests/e2e/admin-staff.spec.ts`

**Interfaces:**
- **settings.ts additions:**
  - `settingsInputSchema`:
    - `storeName` 1–60
    - `contactPhone`: nullable, normalized via `normalizeLebanesePhone` or E.164
    - `contactEmail`: nullable email
    - `social.{instagram,facebook,tiktok}`: nullable https URLs
    - `announcementEn/Ar` ≤ 140; `announcementEnabled`
    - `deliveryFeeCents` 0–10000; `freeDeliveryThresholdCents` null or ≥ 0
    - `deliveryTimeEn/Ar` ≤ 120
    - `trustpilotUrl`: null or `https://(www.)?trustpilot.com/review/...`
  - `updateSettings(db, input: unknown): Promise<{ ok: true } | { ok: false; fieldErrors }>` → action calls `invalidate('settings', 'catalog')`
- **admin/staff.ts:**
  - `listStaff(db)`
  - `setStaffRole(db, a: { actorId; userId; role }): Promise<{ ok: true } | { ok: false; error: 'last_owner' }>`
  - `setStaffActive(db, a: { actorId; userId; active }): Promise<{ ok: true } | { ok: false; error: 'self' | 'last_owner' }>` (deactivating deletes the user's sessions and push subscriptions)
  - `revokeSessions(db, userId)`
  - `listPendingInvites(db)`
  - `revokeInvite(db, id)`
- **audit.ts addition:** `listAudit(db, f: { userId?; entity?; page }): Promise<{ rows; total }>`
- Every admin mutation from Tasks 16–19 writes an `audit()` row with `action` in `entity.verb` form, e.g. `order.status_changed`, `bundle.updated`, `settings.updated`, `staff.deactivated`.

- [ ] **Step 1: Write the failing tests**

```ts
it('validates settings', …)  // deliveryFeeCents -1 invalid; trustpilotUrl 'https://evil.com' invalid; '03 123 456' → '+9613123456'
it('keeps at least one active owner', …) // sole owner demote → 'last_owner'; deactivate self → 'self'
it('deactivation cuts access immediately', async () => {
  // staff has a session row and a push subscription
  expect(await setStaffActive(db, { actorId: ownerId, userId: staffId, active: false })).toEqual({ ok: true });
  expect(await db.select().from(session).where(eq(session.userId, staffId))).toEqual([]);
  expect(await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, staffId))).toEqual([]);
});
it('lists audit rows filtered by entity', …)
```

- [ ] **Step 2: Run** `npx vitest run tests/integration/admin-staff-settings.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the server functions and pages.
  - **Settings:** cards for Store, Announcement (EN/AR + switch), Delivery (fee in USD, free-over threshold, EN/AR time text) and Trustpilot.
  - **Staff:**
    - Table plus an "Invite" dialog. After creating, it shows the link `SITE_URL/admin/invite/<token>` with a Copy button and the note "Send this link privately. It works once and expires in 72 hours."
    - Role select, a deactivate switch, and "Sign out everywhere".
  - **Activity:** paginated table (Beirut time, user, action, summary) with filters.
- [ ] **Step 4: Write and run the E2E test**
  1. The owner invites `staff@ibada.test` and gets the link.
  2. A new browser context accepts it, sets a password, enrolls TOTP and lands on `/admin`.
  3. The nav has no "Settings". `/admin/settings` shows "You don't have access to this page."
  4. The owner changes the announcement EN to "Free delivery all over Lebanon" → `/en` shows it.

  Run: `npx playwright test tests/e2e/admin-staff.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
G add -A && G commit -m "feat(admin): store settings, staff invites and roles, activity log"
```

---

### Task 20: Dashboard analytics

**Files:**
- Modify: `src/server/analytics.ts`
- Create: `src/app/admin/(dashboard)/page.tsx` (replaces the placeholder), `src/components/admin/dashboard/{range-picker,stat-cards,sales-chart,funnel,top-bundles,by-governorate,latest-orders,low-stock}.tsx`
- Test: `tests/integration/analytics.test.ts`, `tests/e2e/admin-dashboard.spec.ts`

**Interfaces:**
- Consumes: `rangeForPreset`, `beirutDateKey`, `beirutDayStart`, `can`.
- Produces (each takes `r: { from: Date; to: Date }`):
  - `dashboardSummary(db, r): Promise<{ salesCents; orders; aovCents; collectedCents; pendingCents }>`
  - `salesSeries(db, r): Promise<{ date: string; salesCents: number; orders: number }[]>`: one entry per Beirut day in range, zero-filled; bucket via SQL `(created_at AT TIME ZONE 'Asia/Beirut')::date`
  - `funnel(db, r): Promise<{ views; addToCart; checkout; orders; conversionPct: number }>`: distinct `session_id` per event type; `conversionPct = round1(orders / views * 100)`, 0 when views = 0
  - `topBundles(db, r, limit = 5): Promise<{ name: string; units: number; revenueCents: number }[]>`
  - `ordersByGovernorate(db, r): Promise<{ governorate: string; orders: number }[]>`
  - `lowStock(db): Promise<{ productId; name; stockUnits; threshold }[]>`
- Definitions per spec §6 "Revenue definitions":
  - `sales` and `orders` exclude cancelled/returned
  - `aov = round(sales / orders)`
  - `collected` = delivered
  - `pending` = new + confirmed + out_for_delivery

- [ ] **Step 1: Write the failing tests**

```ts
// orders inserted with explicit createdAt; now = 2026-09-27T09:00:00Z
it('counts a 00:30 Beirut order in today and its Beirut day', async () => {
  await orderAt('2026-09-26T21:30:00Z', { total: 3600, status: 'new' });
  const today = rangeForPreset('today', now);
  expect((await dashboardSummary(db, today)).orders).toBe(1);
  expect((await salesSeries(db, rangeForPreset('7d', now))).at(-1)).toEqual({ date: '2026-09-27', salesCents: 3600, orders: 1 });
});
it('revenue definitions', …) // new 3600, delivered 5100, cancelled 2000, returned 6000 →
                             // { salesCents: 8700, orders: 2, aovCents: 4350, collectedCents: 5100, pendingCents: 3600 }
it('series is zero-filled for 7 days', …) // length 7, dates consecutive
it('funnel by distinct session', …)       // views s1,s1,s2,s3; add s1,s2; checkout s1; order s1 → { views:3, addToCart:2, checkout:1, orders:1, conversionPct:33.3 }
it('top bundles by units', …)             // Multi-Room ×2 orders, Full Home ×1 → first { name:'Multi-Room Protection', units: 4 }
it('low stock', …)                         // stock 5, threshold 10 → listed
```

- [ ] **Step 2: Run** `npx vitest run tests/integration/analytics.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `analytics.ts` and the page.
  - **Range picker:** Today / 7 days / 30 days / Custom, via `searchParams` (`?range=7d` or `?from=2026-09-01&to=2026-09-27`, both Beirut dates).
  - **Stat cards:** 4 cards with big numbers (formatUsd).
  - **Sales chart:** a Recharts `AreaChart` of sales in blue with a navy stroke. Tooltip shows `$` and orders; the X axis shows `27 Sep`.
  - **Funnel:** 4 horizontal bars with counts and step %.
  - **Lists:** top bundles, governorates, latest 10 orders (links), and a low-stock alert card linking to inventory.
  - **Mobile:** everything is one column; cards are 2×2.
- [ ] **Step 4: Write and run the E2E test.** `/admin` shows the "Sales" card with a `$` value, the chart SVG and "Latest orders" rows.

  Run: `npx playwright test tests/e2e/admin-dashboard.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
G add -A && G commit -m "feat(admin): sales dashboard with Beirut-day charts, funnel and stock alerts"
```

---

### Task 21: Security headers, CSP, full verification and launch docs

**Files:**
- Create: `src/server/security/csp.ts`, `tests/unit/csp.test.ts`, `tests/e2e/headers.spec.ts`, `docs/DEPLOY.md`, `README.md`
- Modify: `src/proxy.ts` (CSP per route), `next.config.ts` (static security headers)

**Interfaces:**
- `buildCsp(a: { nonce?: string; dev: boolean; supabaseHost?: string }): string`
- Directives, always:
  - `default-src 'self'`
  - `img-src 'self' data: blob: https://<supabaseHost>`
  - `style-src 'self' 'unsafe-inline'`
  - `font-src 'self'`
  - `connect-src 'self' https://challenges.cloudflare.com`
  - `frame-src https://challenges.cloudflare.com`
  - `worker-src 'self'`, `manifest-src 'self'`
  - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`
- `script-src`:
  - with a nonce: `'self' 'nonce-<n>' 'strict-dynamic' https://challenges.cloudflare.com`
  - without: `'self' 'unsafe-inline' https://challenges.cloudflare.com`
  - `dev` adds `'unsafe-eval'`
- Proxy:
  - Nonce CSP for `/admin/**`, `/{locale}/checkout`, `/{locale}/track`, `/{locale}/order/**`. It sets the `x-nonce` request header and the CSP request + response headers.
  - Static CSP on every other page response.
  - The i18n middleware response keeps the headers.
- `next.config.ts` `headers()` on `/:path*`:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, only when `APP_ENV === 'production'`
  - `poweredByHeader: false`

- [ ] **Step 1: Write the failing tests**

```ts
// csp (unit)
const s = buildCsp({ dev: false, supabaseHost: 'p.supabase.co' });
expect(s).toContain("script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com");
expect(s).toContain("frame-ancestors 'none'"); expect(s).toContain("object-src 'none'"); expect(s).toContain('https://p.supabase.co');
const n = buildCsp({ nonce: 'abc', dev: false });
expect(n).toMatch(/script-src [^;]*'nonce-abc'[^;]*'strict-dynamic'/); expect(n).not.toMatch(/script-src [^;]*'unsafe-inline'/);
expect(buildCsp({ dev: true })).toContain("'unsafe-eval'"); expect(s).not.toContain("'unsafe-eval'");
// headers (e2e)
test('storefront headers', async ({ request }) => {
  const h = (await request.get('/en')).headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-content-type-options']).toBe('nosniff'); expect(h['x-powered-by']).toBeUndefined();
});
test('admin uses a nonce CSP', async ({ request }) => {
  expect((await request.get('/admin/login')).headers()['content-security-policy']).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
});
test('checkout still works under CSP', …) // rerun the english purchase flow and assert no 'Content Security Policy' console errors
```

- [ ] **Step 2: Run** `npx vitest run tests/unit/csp.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `csp.ts`, the proxy changes and the `next.config.ts` headers.
- [ ] **Step 4: Run the whole suite.** `npm run check && npx playwright test`.
  - Expected: typecheck, lint and all Vitest suites pass.
  - `npm audit --audit-level=high` reports 0 high/critical.
  - Every Playwright spec passes in both the `mobile` and `desktop` projects.
- [ ] **Step 5: Performance check.** With the E2E server running (`npx tsx scripts/e2e-serve.ts`), run:

  `npx lighthouse http://localhost:3100/en --only-categories=performance,accessibility,seo,best-practices --form-factor=mobile --screenEmulation.mobile --quiet --chrome-flags="--headless" --output=json --output-path=.data/lighthouse.json`

  Set `CHROME_PATH` to Playwright's chromium if Chrome isn't installed. Expected: performance ≥ 0.90, accessibility ≥ 0.95, SEO ≥ 0.95. Fix regressions before continuing (usual suspects: hero image `sizes`/`priority`, font preload, client bundle size).
- [ ] **Step 6: Write `docs/DEPLOY.md`.** Follow spec §11 in order, with exact commands:
  - **Supabase:**
    - Create the project (ask the owner before using the Supabase connector).
    - Region `eu-central-1` (closest to Lebanon).
    - Create a public bucket `product-images`.
    - Use the transaction-pooler connection string as `DATABASE_URL`.
    - Run `npm run db:migrate` and `npm run db:seed`.
  - **Vercel:**
    - Import the repo.
    - Set `APP_ENV=production` for Production and Preview, plus every key from `.env.example`.
    - Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 48`.
  - **Turnstile:** create the site for `ibadashop.com`.
  - **VAPID:** `npm run push:keys`.
  - **Owner:** `npm run admin:create-owner`.
  - **Stock:** set real stock in Admin → Inventory (the seed uses 100).
  - **Policies:** review the policy pages.
  - **DNS:** A `76.76.21.21` and CNAME `www` → `cname.vercel-dns.com`, or Vercel nameservers.
  - **Phone setup:**
    - iPhone: Safari → Share → Add to Home Screen → open IBADA → Notifications → Enable. Requires iOS 16.4+.
    - Android: Chrome → Install app → Enable.
    - Send a test notification.
  - **Launch checklist:** place a real test order and cancel it.
- [ ] **Step 7: Write `README.md`.** Local quick start (`npm i`, copy `.env.example` → `.env.local`, `npm run db:start`, then `npm run db:migrate && npm run db:seed && npm run admin:create-owner && npm run dev`), test commands, and the project layout summary.
- [ ] **Step 8: Commit**

```bash
G add -A && G commit -m "feat(security): per-route CSP and security headers; deployment and local-dev docs"
```
