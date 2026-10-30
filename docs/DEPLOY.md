# Deploying the IBADA shop

This guide takes the shop from this repository to a live site, with the admin installed on your phone for order notifications. The shop runs at `https://ibada.vercel.app` until the real domain is connected; the steps below use `https://ibadashop.com`. Follow them in order. It takes about an hour the first time.

## How a deploy works

Vercel deploys every push to the `main` branch. Its build command, `npm run vercel-build`, does four things in order:

1. Applies any new database migrations from `drizzle/`.
2. Adds the store settings and the IBADA ONE product if they are missing. It never overwrites what you changed in the admin.
3. Creates the owner account from the `OWNER_*` variables if there is no owner yet (step 4).
4. Builds the site.

There are no database commands to run by hand: a change that adds a migration updates the database during its build. If the database can't be reached, the build fails and the previous version stays live.

## Accounts you need

Create them yourself; each asks you to accept its terms.

| Service | What it is for | Plan |
|---|---|---|
| GitHub | Holds the code; Vercel deploys from it | Free |
| [Vercel](https://vercel.com) | Hosts the website | **Pro**: Vercel's Hobby plan is for non-commercial sites only, and a shop is commercial |
| [Supabase](https://supabase.com), added through Vercel | Database and product-image storage | **Pro** recommended (see below) |
| [Cloudflare](https://dash.cloudflare.com) | Turnstile, the invisible bot check on checkout, the free-delivery form and admin sign-in | Free |

**Why Supabase Pro:** on the Free plan, Supabase pauses a project after about a week with little activity. While it is paused the shop can't take orders, and every deploy fails with "One or more integration resources failed to provision". Free projects also have no daily backups.

If a Free project gets paused: Supabase dashboard → the project → **Resume project**, and wait until its status is **Healthy** (a few minutes). Then Vercel → **Deployments** → the failed deployment → **Redeploy**.

You also need access to the place where `ibadashop.com` is registered, to change its DNS records.

**Commands below are for PowerShell** (Windows). Run them from the project folder, on an internal drive: the old copy on the `F:` USB drive (exFAT) gave random tool failures.

## 1. Push the code to GitHub

Create a **private** repository on GitHub and push the `main` branch to it. Nothing secret is in the repository: every `.env*` file except `.env.example` is ignored.

## 2. Vercel project and database

1. In Vercel, **Add New → Project** and import the GitHub repository. Leave the framework (Next.js) and the build settings as detected: Vercel runs `vercel-build` from `package.json` by itself.
2. **Settings → Functions → Region**: choose **Frankfurt (`fra1`)**, next to the database.
3. **Storage → Create Database → Supabase.** Choose region **Central EU (Frankfurt)** and connect it to the project for **Production and Preview**. This adds `POSTGRES_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and a few other variables to the project. The shop reads them as they are; don't add `DATABASE_URL` yourself (if you do, it takes priority over `POSTGRES_URL`).
4. Open the database in Supabase (**Open in Supabase** on the Storage page), then **Storage → New bucket**: name it `product-images` and set it to **Public**. Product photos you upload in the admin are stored here.
5. Supabase's Security Advisor will say "RLS enabled, no policies" for every table. That is intentional: the shop reaches the database only from the server, and row-level security with no policies blocks every other kind of access.

The service-role key has full access to the database. It stays in Vercel; never paste it into a browser page or a chat.

## 3. Keys for notifications and the bot check

**Web Push (VAPID) keys** let the admin app on your phone receive order notifications:

```powershell
npm run push:keys
```

It prints a `publicKey` and a `privateKey`. Generate them once and keep them. If you change them later, every phone must turn notifications on again.

**Cloudflare Turnstile:** in the Cloudflare dashboard, go to Turnstile → Add widget. Set the hostnames to `ibadashop.com`, `www.ibadashop.com` and, while it is in use, `ibada.vercel.app`. Set the widget mode to **Managed**. Copy the **site key** and the **secret key**.

**Auth secret:** a random string of at least 32 characters. Generate one:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Keep it stable: changing it signs everyone out, breaks existing authenticator setups and ends every customer's free-delivery claim.

## 4. Environment variables

Vercel → **Settings → Environment Variables**. Add each of these, ticking **Production and Preview**:

| Variable | Value |
|---|---|
| `APP_ENV` | `production` |
| `SITE_URL` | `https://ibadashop.com` (`https://ibada.vercel.app` until the domain is connected) |
| `BETTER_AUTH_SECRET` | the secret from step 3 |
| `STORAGE_DRIVER` | `supabase` |
| `SUPABASE_STORAGE_BUCKET` | `product-images` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | from `npm run push:keys` |
| `VAPID_SUBJECT` | `mailto:` + an email you read, e.g. `mailto:admin@ibadashop.com` |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | from Cloudflare |
| `RATE_LIMIT_MULTIPLIER` | `1` |

The database and Supabase values come from the integration (step 2).

`APP_ENV=production` must be set for Preview too. Without it, a preview deployment would run in development mode: always-pass bot check, local image storage, relaxed checks. In production mode the site stops with an error if a required value is missing or unsafe (for example test Turnstile keys or an `http://` site URL), and the error in the Vercel logs names the variable.

Preview deployments use the same live database. Only you create them, when you push a branch other than `main`.

### Your owner account

Add three more variables, for **Production** only, and type the password in Vercel yourself:

| Variable | Value |
|---|---|
| `OWNER_EMAIL` | the email you will sign in with |
| `OWNER_NAME` | your name |
| `OWNER_PASSWORD` | at least 10 characters |

Then deploy: **Deployments → ⋯ → Redeploy** (variable changes only take effect after a new deploy). The build log shows "Owner account created". Sign in at `/admin`, then **delete `OWNER_PASSWORD` from Vercel**; the account keeps its password.

If an owner already exists, these variables are ignored. Everyone else joins by invite from **Admin → Staff**.

## 5. Point the domain at Vercel

1. Vercel → **Settings → Domains**: add `ibadashop.com` and `www.ibadashop.com`. Make `ibadashop.com` the primary one; `www` redirects to it.
2. At your domain registrar, create exactly the records Vercel shows, usually:
   - `A` record for `@` → `76.76.21.21`
   - `CNAME` record for `www` → `cname.vercel-dns.com`
3. Wait until Vercel shows both domains as **Valid**; the HTTPS certificate is issued automatically. DNS changes can take up to a few hours.
4. Change `SITE_URL` to `https://ibadashop.com` and redeploy.

`SITE_URL` must match the primary address exactly (no trailing slash). Sign-in only accepts requests from that address.

## 6. Set up the admin

1. Open `https://ibadashop.com/admin` and sign in. The first time, you are sent to set up two-step verification. Scan the QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).
2. **Save the 10 backup codes** somewhere safe, away from your phone. Each one works once if you lose the phone.
3. **Inventory:** set the real number of units in stock. The seed starts at 100 units, which is a placeholder.
4. **Products:** check prices, bundle prices, "was" prices, photos and descriptions in both languages. The single device is the pack selected when the page opens.
5. **Settings:** store details, announcement bar, delivery fee and delivery time text, social links. Delivery costs **$4** to start with. Customers who fill in the free-delivery form (first name, phone and the pests they have) get free delivery, and their details appear under **Subscribers**. Set the fee to `$0` to make delivery free for everyone; the free-delivery button then disappears.
6. **Reviews:** add only real customer reviews. The rating badge on the product page (for example 4.8/5.0) and the product's search-engine rating are calculated from them, and are hidden while there are none. To show someone how the page will look with reviews, use **Preview how reviews will look** on the Reviews page (**Copy link** to send it): it shows sample reviews, labelled "Sample", to whoever opens the link for 7 days, and never to other visitors.
7. **Staff:** invite anyone else who handles orders. Each invite link works once, and every person sets up their own two-step verification.

### Review the policy pages

Starter text for the Shipping, Returns, Privacy and Terms pages is in `src/content/policies.ts`, in English and Arabic. It is a draft written for a cash-on-delivery shop in Lebanon, **not legal advice**. Read every page at `/en/policies/…` and `/ar/policies/…`, make sure it matches how you actually work (return window, refund method, delivery areas), and have it checked if you are unsure. Editing that file needs a new deploy.

## 7. Install the admin on your phone for order notifications

Notifications arrive on the phone where you install the admin app and turn them on. Do this on every phone that should ring for new orders.

**iPhone** (iOS 16.4 or newer):

1. Open `https://ibadashop.com/admin` in **Safari** and sign in.
2. Tap **Share → Add to Home Screen → Add**.
3. Open **IBADA** from the home screen. Notifications only work in the installed app, not in a Safari tab.
4. Go to **Notifications → Enable notifications on this device**, then allow when iOS asks.
5. Tap **Send test notification**. A notification should arrive within a few seconds.

**Android** (Chrome):

1. Open `https://ibadashop.com/admin` in Chrome and sign in.
2. Menu **⋮ → Install app** (or **Add to Home screen**).
3. Open **IBADA** from the home screen, go to **Notifications → Enable notifications on this device**, and allow.
4. Tap **Send test notification**.

If no test notification arrives, check that notifications for the IBADA app (and Focus / Do Not Disturb) aren't blocking it in the phone's settings.

## 8. Launch checklist

- [ ] `https://ibadashop.com/en` and `https://ibadashop.com/ar` load, and the Arabic site reads right-to-left.
- [ ] Prices, bundles, photos and stock are correct.
- [ ] Policy pages reviewed in both languages.
- [ ] Owner signed in with two-step verification; backup codes saved; `OWNER_PASSWORD` deleted from Vercel.
- [ ] Admin installed on your phone; **Send test notification** arrives.
- [ ] **Place a real test order** from a phone on mobile data, as a customer would:
  - [ ] The order confirmation page shows the order number.
  - [ ] The notification arrives on your phone within a few seconds.
  - [ ] The order appears in **Admin → Orders**.
  - [ ] **Track order** finds it with the order number and phone.
  - [ ] Cancel it in the admin, and check that the stock goes back up.
- [ ] Claim free delivery with the form on a second test order, check that the delivery line shows FREE and that you appear under **Subscribers**, then cancel that order too.
- [ ] Optional: add the site to Google Search Console and submit `https://ibadashop.com/sitemap.xml`.

## Later

- **Deploying changes:** push to `main`; Vercel builds and deploys it, including any database migration. If a deploy misbehaves, Vercel → Deployments → pick the previous one → **Promote to Production**. A migration that already ran stays applied, so write migrations that the previous version can live with.
- **A deploy fails with "integration resources failed to provision":** the Supabase project is paused or unhealthy. See "Why Supabase Pro" above.
- **Backups:** on Supabase Pro, daily backups are automatic (Database → Backups).
- **Errors:** Vercel → project → **Logs**.
- **Lost phone:** sign in with one of your backup codes, then create a fresh set under **Account → Backup codes**. The admin has no screen yet for moving the authenticator itself to a new phone, so use an authenticator app that backs up to your account (Google Authenticator with sync, Microsoft Authenticator, 1Password). If an owner is locked out completely, a developer can reset two-step verification directly in the database.
