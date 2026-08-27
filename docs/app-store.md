# Publish Bond to the Apple App Store

Expo SDK 57 builds with Xcode 16 / the iOS 18 SDK, which App Store Connect requires.

The iPhone UI is phone-width only (`supportsTablet` is false), so you do **not** need iPad screenshots.

Listing URLs are static files in `public/`. GitHub Pages must include them (workflow runs on `main` and `master`). After deploy, open the privacy and support links and confirm they are HTML documents, not the JavaScript app.

## 1. Accounts and identifiers

1. Paid [Apple Developer](https://developer.apple.com/programs/) membership.
2. `eas login` and `eas init` (writes `extra.eas.projectId` into `app.json` if missing).
3. Bundle id is `com.bond.app`. Change it in `app.json` **before** the first App Store Connect record if it is taken.
4. Create the app in [App Store Connect](https://appstoreconnect.apple.com/): name **Bond**, primary language English, bundle id `com.bond.app`.
5. After the ASC app exists, put its Apple ID into `eas.json` under `submit.production.ios.ascAppId`.

## 2. Hosted backend and secrets

Store users cannot reach `127.0.0.1`. Production already falls back to the hosted project, and a release build refuses localhost.

Set EAS secrets (never commit them):

```sh
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://YOUR-PROJECT.supabase.co
eas secret:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value YOUR_ANON_OR_PUBLISHABLE_KEY
```

Confirm `APP_ENV=production` on the production EAS profile.

For partner push on iOS, generate an APNs key in the Apple Developer portal and attach it with `eas credentials --platform ios`.

## 3. Credentials

```sh
eas credentials --platform ios
```

Use the **production** profile. Let EAS create the distribution cert, provisioning profile, and App Store Connect API key for submit.

## 4. Build an IPA

```sh
npm run build:ios
```

Internal TestFlight-style install without App Review:

```sh
eas build --platform ios --profile preview
```

## 5. App Store Connect listing

Use the copy below. Required URLs:

- Privacy: https://lofiwaffle.github.io/bond/privacy-policy.html
- Support: https://lofiwaffle.github.io/bond/support.html
- Marketing (optional): https://lofiwaffle.github.io/bond/

**App Privacy (nutrition labels)** — matches `ios.privacyManifests` and the in-app policy:

| Data | Linked to identity | Used for tracking | Purpose |
| --- | --- | --- | --- |
| Email | Yes | No | App functionality |
| Name | Yes | No | App functionality |
| User content (check-ins, goals, reviews) | Yes | No | App functionality |
| Device ID (Expo push token, only if they enable partner alerts; advertising ID on the free plan for ads) | Yes | No | App functionality; third-party advertising (free plan) |

Not collected: precise location, contacts, photos, browsing history.

**Age:** 17+ in Apple’s questionnaire (product is for adults 18+). Not Made for Kids.

**Encryption:** HTTPS only. `ios.config.usesNonExemptEncryption` is `false`, so the missing-compliance prompt should not appear.

**Account deletion:** Us → Delete account. The support page documents the same path.

## 6. Screenshots

Apple currently wants iPhone 6.7" (`1320×2868` or `1290×2796`). Capture at least three:

1. Promise / onboarding
2. Private check-in then reveal
3. Create a Bond / invite

```sh
npm run test:store-screens
```

Writes `store/screenshots/` (gitignored). Capture Today, History, Growth, and Us from a paired device or TestFlight build before review — onboarding-only shots are a last resort.

Do not add device bezels unless every shot uses the same treatment.

## 7. Submit

```sh
npm run submit:ios
```

The build lands in TestFlight after processing. In App Store Connect: attach the build, complete the listing, answer the export and content questionnaires, then submit for review.

Create two production accounts, pair them, and paste both emails and passwords into Review Information. Reviewers cannot finish the ritual with a single login.

Review notes to paste: Bond is a private ritual for two people who already know each other. There is no public feed. Demo: sign in with the two review accounts below (already paired), or Continue with Google if that is enabled on the review project. Check in on the same calendar day on both devices to see reveal. Bond Plus is optional and is not required to see a partner’s already-opened day.

**Guideline 4.8:** Google sign-in is offered on login and signup. Before the first iOS submission with that button live, add Sign in with Apple as an equivalent option (email/password alone is not enough once a third-party social login is present).

## Subscriptions (Bond Plus)

Auto-renewing, per couple. One purchase unlocks both partners.

- Bond Plus Monthly: $4.99
- Bond Plus Yearly: $48
- Founding Couple (first 250): $29.99 for the first year, then $48 / year
- 14-day trial after three mutual reveals
- Privacy: https://lofiwaffle.github.io/bond/privacy-policy.html
- EULA: Apple Standard EULA
- Product ids and unpair rules: [docs/bond-plus.md](bond-plus.md)

## Store copy

**Name:** Bond (30 characters max; this is 4)

**Subtitle** (30)

Daily check-ins for two

**Promotional text** (170)

A two-minute daily ritual. Check in privately, reveal when you both show up, and notice patterns without a verdict. No public feed. Bond Plus removes ads.

**Description**

Bond is a private space for two people to check in every day.

Save how connected you felt. Your partner cannot see that day until they check in too. Optional shared words and one small next step stay between you.

After enough opened days, Growth can notice patterns in the labels you both saved — similar days, wider gaps, and what you tagged on more-connected days. These are readings of labels, not a diagnosis.

Shared goals need agreement. Weekly review looks back at last week in your own words.

The free plan shows ads on first open of the day and in History. Bond Plus removes them.

Bond is not therapy or emergency support. Private thoughts stay on this device and are never uploaded.

**Keywords** (100, comma-separated, no competing app names)

couple,relationship,check-in,daily,private,partner,habit,review,goals,together

## What this repo cannot do for you

- Apple Developer enrollment
- Expo login and `eas init` project id
- App Store Connect app record and `ascAppId`
- Paying Apple’s fee
- The first App Review
- Two paired review accounts (emails and passwords in App Store Connect)
- Paired-account screenshots of Today / History / Growth / Us
