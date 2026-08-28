# First Play Store release

Bond ships as a **free** Android app. Paid Bond Plus is not sold in this build (`PLUS_PAID_CHECKOUT_READY` is false) so Google Play Billing policy is not triggered.

Target API 36 is already set. Google requires that for new apps as of 31 August 2026.

Do not run `eas build` until `eas login` and `eas init` have written a real `extra.eas.projectId`. Do not invent that id.

## 0. Accounts

1. Google Play developer account ($25 one-time).
2. Expo account; `npm install -g eas-cli && eas login && eas init`.
3. Hosted Supabase (not localhost). Apply migrations including Bond Plus if you want the free trial. Set EAS secrets:

```sh
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://YOUR-PROJECT.supabase.co
eas secret:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value YOUR_ANON_OR_PUBLISHABLE_KEY
```

`APP_ENV=production` is already on the production profile. Release builds refuse localhost.

Optional, for partner “reveal is ready” remote alerts: Firebase Cloud Messaging + `google-services.json` (gitignored). Local daily reminders work without it. After `eas init`, push tokens also need `extra.eas.projectId`.

## 1. Package name

`com.bondcouple.app` in `app.json` (`android.package`). Permanent. Play rejected `com.bond.app` because that application id and `com.bond.app.firebaseinitprovider` are already used by another developer.

Play already has an **upload key** for this listing (`SHA1 88:54:EE:F1:…`). EAS credentials are per package, so generating a new keystore for `com.bondcouple.app` signs the AAB with the wrong cert. Reuse the existing default keystore from `com.bond.app` (Expo dashboard → Project → Credentials → Android) as the default for `com.bondcouple.app`. Then run a new production AAB. Do not re-upload a bundle signed with `55:7C:78:EA:…`. If you use FCM, add an Android app with this package in Firebase and replace `google-services.json`.

## 2. Credentials and AAB

```sh
eas credentials --platform android   # production; keep the Play upload key (SHA1 88:54:EE:F1:…), do not generate a new keystore
npm run build:android               # AAB, not APK
```

Preview APK for a device: `eas build --platform android --profile preview`.

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
| High-res icon | `store/play-icon-512.png` or `assets/icon.png` | 512×512 or 1024×1024, no alpha |
| Feature graphic | `store/feature-graphic.png` | 1024×500 |
| Phone screenshots | `npm run test:store-screens` → `store/screenshots/play-phone-*.png` | 1080×1920, at least 2 |

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
• After enough opened days, Growth can notice patterns in the labels you both saved — not a verdict

Bond is for two people who already know each other. There is no public feed. The free plan shows ads; Bond Plus removes them. It is not therapy or emergency support. For adults 18+.

You can export your data or delete your account in Us. Help and a report path are on the support page.

## 6. App content questionnaires

**Privacy policy:** same URL as above.

**Ads:** Yes. Free accounts see an ad on first open of the day and ads in History. Bond Plus and the trial remove ads.

**Target audience:** 18+. Not designed for children. News app: No. COVID: No.

**Government / political:** No.

**Health:** Not a health or medical app. Daily check-in labels are not a diagnosis.

**Financial features:** No.

**Photos and videos:** We do not access photos, video, or files. Those Android permissions are blocked.

**Advertising ID:** Yes, for ads on the free plan (Google AdMob). Not used for Bond Plus or the trial. Check-in content is not used to target ads.

**Data safety** (encrypted in transit; users can delete; not sold; ads on the free plan only):

| Data | Collected | Shared | Purpose |
| --- | --- | --- | --- |
| Email | Yes | Auth/database provider | Account |
| Name (display name) | Yes | Partner, after pairing | App functionality |
| User-generated content | Yes (check-ins, goals, reviews) | Partner, per in-app rules | App functionality |
| Device ID | Yes, Expo push token if they turn on partner reveal alerts; advertising ID for free-plan ads | Push provider; Google AdMob | App functionality; advertising |
| Photos / location / contacts | No | — | — |

Crash logs stay on device. We do not run analytics.

**Account deletion:** Us → Delete account. Public URL: the support page.

**User-generated content:** Private between two paired adults. No public feed. Users can leave the Bond, delete the account, or report a problem from Us / the support page.

**Content rating (IARC):** Lifestyle / social. No violence, sexual content, drugs, or simulated gambling. Users interact only with one invited partner.

## 7. Review notes (closed test / production)

Bond is a private daily check-in for two people who already know each other. There is no public feed. The free plan shows ads; Bond Plus removes them. Demo: create two accounts, pair with the invite code, check in on the same calendar day to see reveal. Account deletion is Us → Delete account. Notifications are optional.

## 8. After closed testing

Apply for production access, then promote a release to Production when Google enables it. Turn on Play App Signing if the Console asks (EAS upload key is the correct upload key).

Bond Plus paid plans stay off until Play subscriptions and `PLUS_PAID_CHECKOUT_READY` are set. Do not add prices to the listing until then.

## What this repo cannot do for you

- Expo login, Play signup, and the $25 fee
- `eas init` project id
- A unique package name if `com.bondcouple.app` is taken
- 12 closed testers and 14 days of opt-in
- Firebase `google-services.json`
- GitHub Pages deploy of privacy/support HTML
- Google’s review
