# IBADA shop

Online shop for the IBADA ONE ultrasonic pest repeller, for customers in Lebanon: English and Arabic, prices in USD, cash on delivery, guest checkout. It includes an admin dashboard for orders, products, stock, customers, discounts, reviews, staff and sales. The admin installs on a phone as an app and sends a notification for every new order.

Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Drizzle ORM on Postgres, Better Auth (password + mandatory authenticator-app 2FA), next-intl, Web Push and Cloudflare Turnstile.

- **Design and decisions:** [docs/superpowers/specs/2026-09-27-ibada-shop-design.md](docs/superpowers/specs/2026-09-27-ibada-shop-design.md)
- **Going live:** [docs/DEPLOY.md](docs/DEPLOY.md)

## Run it locally

Requirements: Node.js 20.9 or newer. No separate Postgres install is needed, because `npm run db:start` runs an embedded one.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Open `.env.local` and set `BETTER_AUTH_SECRET` to a random string of at least 32 characters:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

The other defaults work as they are for local development: local database, local image storage, and Cloudflare's always-pass Turnstile test keys.

Start the database and leave it running in its own terminal. It stores its data in `.data/pg` and listens on port 54329:

```bash
npm run db:start
```

In a second terminal, create the tables, the product and your admin account (it asks for a password):

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run admin:create-owner -- --email you@example.com --name "Your Name"
```

Then start the site:

```bash
npm run dev
```

- Shop: http://localhost:3000/en and http://localhost:3000/ar
- Admin: http://localhost:3000/admin. The first sign-in asks you to set up an authenticator app.

Push notifications need VAPID keys in `.env.local` (`npm run push:keys`) and a browser that allows notifications on `localhost`.

## Tests

| Command | What it runs |
|---|---|
| `npm run check` | Type check, lint, unit and integration tests (Vitest, with an in-memory Postgres), and `npm audit` for high-severity issues |
| `npm test` | Vitest only |
| `npm run test:e2e` | Playwright on a production build, phone and desktop browsers |

`npm run test:e2e` builds the site into `.next-e2e`, starts it on port 3100 with a fresh database on port 54330, and reuses that server on later runs. It runs the full build, so the first run takes several minutes. After changing code, stop it so the next run rebuilds:

```bash
npm run e2e:stop
```

## Project layout

```
src/app/[locale]/(shop)/   storefront pages (home, product, shop, checkout, order, track, policies, contact)
src/app/admin/             admin: sign-in, dashboard and every management page, order slips for printing
src/server/                server-only code: orders, catalogue, settings, auth, analytics, push, storage, security
src/lib/                   shared helpers: money, phone numbers, Lebanese regions, order statuses, permissions
src/content/policies.ts    policy page text (English and Arabic)
messages/                  storefront text (en.json, ar.json)
drizzle/                   database migrations
scripts/                   database, owner account, assets and test-server commands
tests/                     unit, integration and end-to-end tests
```

## Other commands

| Command | What it does |
|---|---|
| `npm run db:generate` | Create a migration after changing `src/server/db/schema.ts` |
| `npm run assets` | Rebuild web images from the brand files in `assets/source` |
| `npm run push:keys` | Generate a Web Push key pair |
