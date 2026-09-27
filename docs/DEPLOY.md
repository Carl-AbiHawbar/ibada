# Deploying the IBADA shop

This guide takes the shop from this repository to a live site at `https://ibadashop.com`, with the admin installed on your phone for order notifications. Follow the steps in order. It takes about an hour the first time.

## Before you start

**Move the project off the USB drive.** The project currently lives on `F:`, which is formatted exFAT. exFAT has no file ownership or symbolic links. Git warns about "dubious ownership", and some tools fail at random under load. Copy the folder to your internal drive (NTFS), for example `C:\dev\ibada`, and work from there. Skip `node_modules`, `.next` and `.data`; run `npm install` again after copying.

**Accounts you need** (create them yourself; each asks you to accept its terms):

| Service | What it is for | Plan |
|---|---|---|
| GitHub | Holds the code; Vercel deploys from it | Free |
| [Vercel](https://vercel.com) | Hosts the website | **Pro**: Vercel's Hobby plan is for non-commercial sites only, and a shop is commercial |
| [Supabase](https://supabase.com) | Database and product-image storage | **Pro** recommended: the Free plan pauses inactive projects and has no daily backups |
| [Cloudflare](https://dash.cloudflare.com) | Turnstile, the invisible bot check on checkout and admin login | Free |

You also need access to the place where `ibadashop.com` is registered, to change its DNS records.

**Commands below are for PowerShell** (Windows). Run them from the project folder.

## 1. Push the code to GitHub

Create a **private** repository on GitHub and push this branch to it. Nothing secret is in the repository: every `.env*` file except `.env.example` is ignored.

## 2. Supabase: database and image storage

1. Create a new project. Choose region **Central EU (Frankfurt), `eu-central-1`**, the closest to Lebanon. Save the database password it asks for in your password manager.
2. **Storage → New bucket**: name `product-images`, set it to **Public**. Product photos you upload in the admin are stored here.
3. Collect these values:
   - **Project URL** (Project Settings → API): `https://<project-ref>.supabase.co`
   - **service_role / secret key** (Project Settings → API keys). This key has full access: it goes only into Vercel and your local shell, never into a browser or a chat.
   - **Connection strings** (Connect button at the top):
     - *Transaction pooler* (port `6543`) is for the website (`DATABASE_URL` on Vercel).
     - *Session pooler* (port `5432`) is for the one-off commands in step 3.
4. Supabase's Security Advisor will say "RLS enabled, no policies" for every table. That is intentional: the shop reaches the database only from the server, and row-level security with no policies blocks every other kind of access.

## 3. Create the tables, the product and your owner account

Run these once, from your computer, against the production database. Values set in the shell take priority over `.env.local`.

```powershell
$env:DATABASE_URL = "<Session pooler connection string>"
$env:SITE_URL = "https://ibadashop.com"
$env:BETTER_AUTH_SECRET = "<the secret you will also put on Vercel, see step 5>"
npm run db:migrate
npm run db:seed
npm run admin:create-owner -- --email you@example.com --name "Your Name"
```

- `db:migrate` creates the tables.
- `db:seed` adds the store settings and the IBADA ONE product with its four bundles. It is safe to run again, because it skips anything that already exists.
- `admin:create-owner` asks for your password twice (at least 10 characters) without showing it. It refuses to run if an owner already exists; everyone else joins by invite from **Admin → Staff**.

Close the PowerShell window afterwards so the connection string doesn't stay in it.

## 4. Keys for notifications and the bot check

**Web Push (VAPID) keys** let the admin app on your phone receive order notifications:

```powershell
npm run push:keys
```

It prints a `publicKey` and a `privateKey`. Generate them once and keep them. If you change them later, every phone must turn notifications on again.

**Cloudflare Turnstile:** in the Cloudflare dashboard, go to Turnstile → Add widget. Set the hostnames to `ibadashop.com` and `www.ibadashop.com`, and the widget mode to **Managed**. Copy the **site key** and the **secret key**.

**Auth secret:** a random string of at least 32 characters. Generate one:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Keep it stable: changing it signs everyone out and breaks existing authenticator setups.

## 5. Vercel

1. **Add New → Project**, import the GitHub repository. The framework is detected as Next.js; leave the build settings as they are.
2. **Settings → Functions → Region**: choose **Frankfurt (`fra1`)**, next to the database.
3. **Settings → Environment Variables**. Add each of these, ticking **Production and Preview**:

| Variable | Value |
|---|---|
| `APP_ENV` | `production` |
| `DATABASE_URL` | Supabase **Transaction pooler** string (port 6543) |
| `SITE_URL` | `https://ibadashop.com` |
| `BETTER_AUTH_SECRET` | the secret from step 4 |
| `STORAGE_DRIVER` | `supabase` |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role key |
| `SUPABASE_STORAGE_BUCKET` | `product-images` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | from `npm run push:keys` |
| `VAPID_SUBJECT` | `mailto:` + an email you read, e.g. `mailto:admin@ibadashop.com` |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | from Cloudflare |
| `RATE_LIMIT_MULTIPLIER` | `1` |

`APP_ENV=production` must be set for Preview too. Without it, a preview deployment would run in development mode: always-pass bot check, local image storage, relaxed checks. In production mode the site stops with an error if a required value is missing or unsafe (for example test Turnstile keys or an `http://` site URL), and the error in the Vercel logs names the variable.

Preview deployments use the same live database. Only you create them, when you push a branch other than the main one.

4. **Deploy.** Environment variable changes take effect only after a new deploy (Deployments → ⋯ → Redeploy).

## 6. Point the domain at Vercel

1. Vercel → **Settings → Domains**: add `ibadashop.com` and `www.ibadashop.com`. Make `ibadashop.com` the primary one; `www` redirects to it.
2. At your domain registrar, create exactly the records Vercel shows, usually:
   - `A` record for `@` → `76.76.21.21`
   - `CNAME` record for `www` → `cname.vercel-dns.com`
3. Wait until Vercel shows both domains as **Valid**; the HTTPS certificate is issued automatically. DNS changes can take up to a few hours.

`SITE_URL` must match the primary domain exactly (`https://ibadashop.com`, no trailing slash). Sign-in only accepts requests from that address.

## 7. Set up the admin

1. Open `https://ibadashop.com/admin` and sign in. The first time, you are sent to set up two-step verification. Scan the QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).
2. **Save the 10 backup codes** somewhere safe, away from your phone. Each one works once if you lose the phone.
3. **Inventory:** set the real number of units in stock. The seed starts at 100 units, which is a placeholder.
4. **Products:** check prices, bundle prices, "was" prices, photos and descriptions in both languages.
5. **Settings:** store details, announcement bar, delivery fee and delivery time text, social links. Delivery is free (`$0`); change it here when that changes.
6. **Reviews:** add only real customer reviews. The rating stars and the product's search-engine rating come from them, and are hidden while there are none. Add a Trustpilot link only if you have a real Trustpilot profile.
7. **Staff:** invite anyone else who handles orders. Each invite link works once, and every person sets up their own two-step verification.

### Review the policy pages

Starter text for the Shipping, Returns, Privacy and Terms pages is in `src/content/policies.ts`, in English and Arabic. It is a draft written for a cash-on-delivery shop in Lebanon, **not legal advice**. Read every page at `/en/policies/…` and `/ar/policies/…`, make sure it matches how you actually work (return window, refund method, delivery areas), and have it checked if you are unsure. Editing that file needs a new deploy.

## 8. Install the admin on your phone for order notifications

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

## 9. Launch checklist

- [ ] `https://ibadashop.com/en` and `https://ibadashop.com/ar` load, and the Arabic site reads right-to-left.
- [ ] Prices, bundles, photos and stock are correct.
- [ ] Policy pages reviewed in both languages.
- [ ] Owner signed in with two-step verification; backup codes saved.
- [ ] Admin installed on your phone; **Send test notification** arrives.
- [ ] **Place a real test order** from a phone on mobile data, as a customer would:
  - [ ] The order confirmation page shows the order number.
  - [ ] The notification arrives on your phone within a few seconds.
  - [ ] The order appears in **Admin → Orders**.
  - [ ] **Track order** finds it with the order number and phone.
  - [ ] Cancel it in the admin, and check that the stock goes back up.
- [ ] Try a discount code, if you created one, on a second test order and cancel that too.
- [ ] Optional: add the site to Google Search Console and submit `https://ibadashop.com/sitemap.xml`.

## Later

- **Deploying changes:** push to the main branch; Vercel builds and deploys it. If a deploy misbehaves, Vercel → Deployments → pick the previous one → **Promote to Production**.
- **Database changes:** a code change that adds a file under `drizzle/` needs `npm run db:migrate` against production (step 3) **before** it is deployed.
- **Backups:** on Supabase Pro, daily backups are automatic (Database → Backups).
- **Errors:** Vercel → project → **Logs**.
- **Lost phone:** sign in with one of your backup codes, then create a fresh set under **Account → Backup codes**. The admin has no screen yet for moving the authenticator itself to a new phone, so use an authenticator app that backs up to your account (Google Authenticator with sync, Microsoft Authenticator, 1Password). If an owner is locked out completely, a developer can reset two-step verification directly in the database.
