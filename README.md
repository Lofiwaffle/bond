# Bond

Private daily check-ins for two people. Live web app (installable on your phone):

**https://lofiwaffle.github.io/bond/**

## Install from GitHub

1. Open [https://lofiwaffle.github.io/bond/](https://lofiwaffle.github.io/bond/) in Chrome or Safari.
2. On Android Chrome: menu → **Install app** (or **Add to Home screen**).
3. On iPhone Safari: Share → **Add to Home Screen**.

That installs Bond as a standalone app from this repo’s GitHub Pages build. It uses the hosted Supabase project `melmzlgzfcysbnvtuksv`.

If sign-up fails because tables are missing, run `supabase/bootstrap.sql` in the [SQL editor](https://supabase.com/dashboard/project/melmzlgzfcysbnvtuksv/sql/new). Under Authentication → URL configuration add `https://lofiwaffle.github.io/bond/**` and `bond://**` (needed for confirmation, Google sign-in, and password reset). Then refresh the app.

**Google sign-in:** In Google Cloud, create an OAuth **web** client. Authorized redirect URI: `https://melmzlgzfcysbnvtuksv.supabase.co/auth/v1/callback`. In Supabase → Authentication → Providers → Google, paste that client ID and secret and enable the provider. Do not invent client IDs in the app.

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
