# Bond

Private daily check-ins for two people. Live web app (installable on your phone):

**https://lofiwaffle.github.io/bond/**

## Cloud project

Bond is already a cloud project:

| Piece | Where |
|-------|--------|
| Source of truth | [github.com/Lofiwaffle/bond](https://github.com/Lofiwaffle/bond) (`main`) |
| Live web app | [lofiwaffle.github.io/bond](https://lofiwaffle.github.io/bond/) (GitHub Pages) |
| Backend | Hosted Supabase `melmzlgzfcysbnvtuksv` |
| Mobile builds | EAS (`npm run build:android` / `build:ios`) |

### Cursor Cloud Agents

1. In Cursor, open **Cloud Agents** / start a cloud agent.
2. Select the GitHub repo **Lofiwaffle/bond** (branch `main` for production, or a feature branch for WIP).
3. Agents clone from GitHub and work in the cloud. They do not need SSH into `llm-server`.

### Laptop

```sh
git clone git@github.com:Lofiwaffle/bond.git
cd bond
git checkout main
cp .env.example .env
# For cloud backend, uncomment the hosted EXPO_PUBLIC_SUPABASE_* lines in .env
npm install
npx expo start
```

Or skip local setup and use the live app: [https://lofiwaffle.github.io/bond/](https://lofiwaffle.github.io/bond/).

### Deploy notes

- Pushing to `main` / `master` runs [.github/workflows/pages.yml](.github/workflows/pages.yml) and republishes Pages.
- Pages secrets: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Supabase Auth URL allowlist must include `https://lofiwaffle.github.io/bond/**` and `bond://**`.

## Install from GitHub

1. Open [https://lofiwaffle.github.io/bond/](https://lofiwaffle.github.io/bond/) in Chrome or Safari.
2. On Android Chrome: menu → **Install app** (or **Add to Home screen**).
3. On iPhone Safari: Share → **Add to Home Screen**.

That installs Bond as a standalone app from this repo’s GitHub Pages build. It uses the hosted Supabase project `melmzlgzfcysbnvtuksv`.

If sign-up fails because tables are missing, run `supabase/bootstrap.sql` in the [SQL editor](https://supabase.com/dashboard/project/melmzlgzfcysbnvtuksv/sql/new). If that errors with `relation "couples" already exists`, the project already has the older tables — paste `supabase/catchup_notifications_and_plays.sql` instead. Under Authentication → URL configuration add `https://lofiwaffle.github.io/bond/**` and `bond://**` (needed for confirmation, Google sign-in, and password reset). Then refresh the app.

**Google sign-in:** In Google Cloud, create an OAuth **web** client. Authorized redirect URI: `https://melmzlgzfcysbnvtuksv.supabase.co/auth/v1/callback`. In Supabase → Authentication → Providers → Google, paste that client ID and secret and enable the provider. Do not invent client IDs in the app.

**Email confirmation:** Built-in Supabase mail is rate-limited and often never arrives on a Play Store install. Add custom SMTP under Authentication → Emails. In the Confirm signup template, keep the link and add `{{ .Token }}` so the app's 6-digit code field works.

Privacy policy: [https://lofiwaffle.github.io/bond/privacy-policy.html](https://lofiwaffle.github.io/bond/privacy-policy.html)

Support: [https://lofiwaffle.github.io/bond/support.html](https://lofiwaffle.github.io/bond/support.html)

## Run locally

```sh
git clone https://github.com/Lofiwaffle/bond.git
cd bond
cp .env.example .env
# point EXPO_PUBLIC_SUPABASE_* at your local or hosted Supabase
npm install
npx expo start
```

Then press `a` for Android, `i` for iOS, or `w` for web. Expo Go can load the development server.

## Android Play Store

First release is a free AAB to internal testing, then closed testing. Personal Play accounts need 12 testers opted in for 14 days before production. See [docs/play-store.md](docs/play-store.md).

## Apple App Store

Production iOS builds use EAS (`npm run build:ios`). See [docs/app-store.md](docs/app-store.md).

Bond Plus (optional couple subscription) is documented in [docs/bond-plus.md](docs/bond-plus.md).
