# First Play Store release

Bond ships as a **free** Android app, version **1.0.2**. Paid Bond Plus is not sold in this build (`PLUS_PAID_CHECKOUT_READY` is false) so Google Play Billing policy is not triggered.

Production never requests Google’s sample AdMob units and never writes those sample app IDs into the Android manifest. Until you set real `EXPO_PUBLIC_ADMOB_*` EAS secrets (app id + banner + interstitial), the free plan shows the in-app Bond Plus house unit, and the advertising ID permission is removed so Data Safety can say it is not collected. Do not invent a publisher id.

Target API 36 is already set. Google requires that for new apps and updates as of 31 August 2026. Native libraries use non-legacy packaging so the AAB can meet the 16 KB page-size rule.

Do not generate a new upload keystore. Play already has **SHA1 88:54:EE:F1:…** for this listing.

Paste-ready listing text: [store/play-listing.txt](../store/play-listing.txt).

## 0. Accounts

1. Google Play developer account ($25 one-time).
2. Expo account (`eas login`). Project id is already `190e203f-7911-4a51-8617-33dc8f606274`.
3. Hosted Supabase (not localhost). Native production already falls back to hosted Bond. `APP_ENV=production` is on the production profile. Release builds refuse localhost.

Optional, for paid AdMob inventory (otherwise house ads only):

```sh
eas secret:create --name EXPO_PUBLIC_ADMOB_ANDROID_APP_ID --value ca-app-pub-xxxxxxxxxxxxxxxx~xxxxxxxxxx
eas secret:create --name EXPO_PUBLIC_ADMOB_BANNER_ID --value ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx
eas secret:create --name EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID --value ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx
```

Optional, for partner “reveal is ready” remote alerts: Firebase Cloud Messaging + `google-services.json` (gitignored). Local daily reminders work without it.

## 1. Package name

`com.bondcouple.app` in `app.json` (`android.package`). Permanent. Play rejected `com.bond.app` because that application id and `com.bond.app.firebaseinitprovider` are already used by another developer.

Play already has an **upload key** for this listing (`SHA1 88:54:EE:F1:…`). EAS credentials are per package, so generating a new keystore for `com.bondcouple.app` signs the AAB with the wrong cert. Reuse the existing default keystore named **lofi** as the default for `com.bondcouple.app`. Then run a new production AAB. Do not re-upload a bundle signed with `55:7C:78:EA:…`. If you use FCM, add an Android app with this package in Firebase and replace `google-services.json`.

## 2. Credentials and AAB

```sh
eas credentials --platform android   # production; keep the Play upload key (SHA1 88:54:EE:F1:…), do not generate a new keystore
npm run build:android               # AAB, not APK
```

Preview APK for a device: `eas build --platform android --profile preview`.

Confirm `npm run test:production` (and ideally `npm run test:release`) before the production profile.

## 3. Play Console app

Create the app: name **Bond**, default language English (US), type **App**, **Free**, declarations.

First AAB goes to **internal testing** as a **draft** and is **not** sent for review (`eas.json`). Then:

```sh
eas credentials --platform android  # upload Play Developer API service-account JSON
npm run submit:android
```

Or upload the AAB in Play Console → Testing → Internal testing.

## 4. Closed testing before production

Personal developer accounts created after 13 November 2023 cannot publish to production until a **closed test** has **at least 12 testers opted in continuously for 14 days**. Internal testers do not count.

1. Create a closed testing release from the same AAB (or a later production-profile AAB).
2. Add 15–20 emails so drop-outs do not restart the clock.
3. Testers must open the opt-in link and install.
4. Keep them opted in for 14 consecutive days, then apply for production access from the Play Console dashboard.

Organization Play accounts are outside that stated rule; still use closed testing.

## 5. Store listing (paste from below)

Assets:

| Item | File | Size |
| --- | --- | --- |
| High-res icon | `store/play-icon-512.png` | 512×512, no alpha |
| Feature graphic | `store/feature-graphic.png` | 1024×500 |
| Phone screenshots | `store/play-phone-assets/*.png` | 1080×1920, four shots |

Regenerate onboarding captures with `npm run test:store-screens` (writes gitignored `store/screenshots/play-phone-*.png`). Copy those over the committed `store/play-phone-assets/` files when the onboarding UI changes.

Phone-only UI; 7" / 10" tablet screenshots are not required.

Privacy: https://lofiwaffle.github.io/bond/privacy-policy.html

Support / deletion / reports: https://lofiwaffle.github.io/bond/support.html

Confirm those two URLs are **static HTML** after GitHub Pages deploys, not the JavaScript app.

Category: Lifestyle. Tags: relationship, couples (optional).

### Short description (80)

A two-minute daily ritual for two people, before distance builds.

### Full description

Bond is a private space for two people to check in every day.

• Save how connected you felt. Your partner cannot see that day until they check in too
• Optional shared words and one small next step stay between you
• Feed holds your check-ins and together activities as a private thread
• After enough opened days, Growth can notice patterns in the labels you both saved — not a verdict

Bond is for two people who already know each other. There is no public feed. The free plan shows ads; Bond Plus removes them. It is not therapy or emergency support. For adults 18+.

You can export your data or delete your account in Us. Help and a report path are on the support page.

## 6. App content questionnaires

**Privacy policy:** same URL as above.

**Ads:** Yes. Free accounts see a labeled ad on first open of the day and ads in History. This 1.0.2 production AAB uses in-app house ads unless you set real AdMob EAS secrets. Bond Plus and the trial remove ads.

**Target audience:** 18+. Not designed for children. News app: No. COVID: No.

**Government / political:** No.

**Health:** Not a health or medical app. Daily check-in labels are not a diagnosis.

**Financial features:** No. Bond Plus paid checkout is off.

**Photos and videos:** We do not access photos, video, or files. Those Android permissions are blocked.

**Advertising ID:** No for this AAB (house ads only; `AD_ID` is blocked). If you later set real AdMob secrets, change this to Yes and resubmit Data Safety.

**Data safety** (encrypted in transit; users can delete; not sold; ads on the free plan only):

| Data | Collected | Shared | Purpose |
| --- | --- | --- | --- |
| Email | Yes | Auth/database provider | Account |
| Name (display name) | Yes | Partner, after pairing | App functionality |
| User-generated content | Yes (check-ins, together activities, goals, reviews) | Partner, per in-app rules | App functionality |
| Device ID | Optional Expo push token if they turn on partner reveal alerts | Push provider | App functionality |
| Advertising ID | No in 1.0.2 unless AdMob secrets are set | — | — |
| Photos / location / contacts | No | — | — |

Crash logs stay on device. We do not run analytics.

**Account deletion:** Us → Delete account. Public URL: the support page.

**User-generated content:** Private between two paired adults. No public feed. Users can leave the Bond, delete the account, or report a problem from Us / the support page.

**Content rating (IARC):** Lifestyle / social. No violence, sexual content, drugs, or simulated gambling. Users interact only with one invited partner.

## 7. Review notes (closed test / production)

Bond is a private daily check-in for two people who already know each other. There is no public feed. The free plan shows labeled house ads; Bond Plus removes them. Demo: create two accounts, pair with the invite code, check in on the same calendar day to see reveal. Account deletion is Us → Delete account. Notifications are optional.

## 8. After closed testing

Apply for production access, then promote a release to Production when Google enables it. Turn on Play App Signing if the Console asks (EAS upload key is the correct upload key).

Bond Plus paid plans stay off until Play subscriptions and `PLUS_PAID_CHECKOUT_READY` are set. Do not add prices to the listing until then.

## Play Console checklist

1. App name Bond, free, English (US), category Lifestyle.
2. Privacy and support URLs above resolve to static HTML.
3. Upload 512 icon, 1024×500 feature graphic, and at least two 1080×1920 phone screenshots.
4. Complete Ads, target audience (18+), Data safety, and photos/videos questionnaires from section 6.
5. Upload the production AAB (`npm run build:android`) to Internal testing as a draft.
6. Add yourself as an internal tester, install, create two accounts, pair, check in.
7. Move the same AAB to Closed testing and collect 12 testers for 14 days if this is a personal Play account.
8. Do not send for production review until that closed-test clock is done.

## What this repo cannot do for you

- Expo login, Play signup, and the $25 fee
- A unique package name if `com.bondcouple.app` is taken
- 12 closed testers and 14 days of opt-in
- Firebase `google-services.json`
- GitHub Pages deploy of privacy/support HTML (push to `main`)
- Google’s review
