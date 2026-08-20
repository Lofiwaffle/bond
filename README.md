# Bond

Private daily check-ins for two people. Live web app (installable on your phone):

**https://lofiwaffle.github.io/bond/**

## Install from GitHub

1. Open [https://lofiwaffle.github.io/bond/](https://lofiwaffle.github.io/bond/) in Chrome or Safari.
2. On Android Chrome: menu → **Install app** (or **Add to Home screen**).
3. On iPhone Safari: Share → **Add to Home Screen**.

That installs Bond as a standalone app from this repo’s GitHub Pages build.

The installed app needs a **hosted** Supabase project (`https://….supabase.co`). Local `127.0.0.1` will not work from GitHub Pages.

1. Create a project at [supabase.com](https://supabase.com/dashboard/projects) and run the SQL files in `supabase/migrations`.
2. Either paste **Project URL** and the **publishable/anon key** on the in-app Connect screen, or add GitHub Actions secrets `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and re-run **Installable web app**.

Privacy policy (Play Store URL): [https://lofiwaffle.github.io/bond/privacy-policy.html](https://lofiwaffle.github.io/bond/privacy-policy.html)

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

Production Android builds use EAS (`npm run build:android`). See [docs/play-store.md](docs/play-store.md).
