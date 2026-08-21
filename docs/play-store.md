# Publish Bond to Google Play

Expo SDK 57 already targets Android API 36, which Google Play requires for new apps as of 31 August 2026.

## 1. Hosted backend

Local `127.0.0.1:54321` will not work for store users. Create a hosted Supabase project, run the migrations in `supabase/migrations/`, and set EAS secrets (never commit them):

```sh
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://YOUR-PROJECT.supabase.co
eas secret:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value YOUR_ANON_OR_PUBLISHABLE_KEY
```

Confirm `APP_ENV=production` on the production EAS profile (already in `eas.json`). A release build throws if the URL is localhost.

## 2. Unique package name

`android.package` is `com.bond.app`. Google Play package names are permanent. If that id is taken, change it in `app.json` **before** the first upload.

## 3. Expo / EAS

```sh
npm install -g eas-cli
eas login
eas init          # writes extra.eas.projectId into app.json
eas build:configure
```

Create an upload keystore with EAS (do not generate a local debug keystore for production):

```sh
eas credentials --platform android
```

Choose the **production** profile and let EAS generate and store the Play upload keystore.

## 4. Build an AAB (required; APK is not accepted for new apps)

```sh
eas build --platform android --profile production
```

Preview APK for device testing:

```sh
eas build --platform android --profile preview
```

## 5. Play Console (one-time)

1. Pay for a [Play developer account](https://play.google.com/apps/publish/signup/).
2. Create the app: name **Bond**, default language, app type **App**, free/paid, declarations.
3. Complete **Store listing**:
   - Short description (80 chars) and full description: copy from below
   - App icon: `assets/icon.png` (512×512 minimum; 1024 is used)
   - Feature graphic: `store/feature-graphic.png` (1024×500)
   - Phone screenshots: at least 2, up to 8 (1080×1920 recommended). Capture Entries, Check-in, Bond, Us from a device or emulator
   - Privacy policy URL: https://lofiwaffle.github.io/bond/privacy-policy.html
4. **App content**:
   - Privacy policy URL (same)
   - Ads: No
   - Target audience: 18+
   - News / COVID / Data safety as applicable
   - **Data safety**: collect email + user-generated content; encrypted in transit; account deletion available; not sold
   - **Account deletion**: in-app path is Us → Delete account. Play also needs a public deletion URL — use the hosted privacy page (it documents the same path and an email request).
5. **Content rating** questionnaire (social / lifestyle; no violence).
6. Create a Google Cloud **service account** with Play Android Developer permission and upload the JSON via `eas credentials` (needed for `eas submit`).
7. First AAB must be uploaded (EAS submit or Play Console). First submit uses the **internal testing** track as a draft (`eas.json`).

## 6. Submit

```sh
eas submit --platform android --profile production
```

Then in Play Console: finish the listing, promote the internal release when ready, and send for review.

## Store copy

**Short description**

Daily check-ins, shared goals, and weekly reviews for the two of you.

**Full description**

Bond is a private space for couples to check in every day.

• Save how connected you felt, answer a shared prompt, and tag what shaped the day  
• Your partner’s entry stays hidden until they check in too  
• Keep SMART goals, achievements, streaks, and weekly review summaries together  

Bond is for two people who already know each other. There is no public feed and no ads.

## Data safety (Play form)

| Data type | Collected | Shared with partner | Purpose |
| --- | --- | --- | --- |
| Email | Yes | No | Account |
| Name | Yes (display name) | Yes, after pairing | App functionality |
| User-generated content | Yes (check-ins, goals, reviews) | Yes, per in-app rules | App functionality |
| Photos / location / contacts | No | — | — |

Encryption in transit: yes. Optional deletion: yes.

## What this repo cannot do for you

- Expo login and Play Console signup
- A public privacy-policy URL
- Hosted production database
- Phone screenshots from a running device
- Paying the Play registration fee
- The first review by Google
