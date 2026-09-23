# App Store Connect — paste pack

Use this with the Bond **1.0.1** iOS binary (`com.bond.app`). Bundle id is already in `app.json`. Do not invent a new one after the first App Store Connect record exists.

Privacy and support URLs must stay static HTML after GitHub Pages deploys:

- Privacy: https://lofiwaffle.github.io/bond/privacy-policy.html
- Support: https://lofiwaffle.github.io/bond/support.html
- Marketing: https://lofiwaffle.github.io/bond/
- EULA: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

## App information

- Name: Bond
- Subtitle: Daily check-ins for two
- Category: Lifestyle
- Age: 17+ in Apple’s questionnaire (product is for adults 18+). Not Made for Kids.
- Encryption: Exempt. `ITSAppUsesNonExemptEncryption` is false (HTTPS only).

## Version 1.0.1 What’s New

Daily check-in on one screen. Bond Plus is $5.99/month or $60/year for both of you, with a 7-day free trial after pairing.

## Promotional text

A two-minute daily ritual. Check in privately, reveal when you both show up, and notice patterns without a verdict. No public feed. Bond Plus removes ads.

## Description

Bond is a private space for two people to check in every day.

Save how connected you felt. Your partner cannot see that day until they check in too. Optional shared words and one small next step stay between you.

After enough opened days, Growth can notice patterns in the labels you both saved — similar days, wider gaps, and what you tagged on more-connected days. These are readings of labels, not a diagnosis.

Shared goals need agreement. Weekly review looks back at last week in your own words.

The free plan shows ads on first open of the day and in History. Bond Plus removes them.

Bond is not therapy or emergency support. Private thoughts stay on this device and are never uploaded.

## Keywords

couple,relationship,check-in,daily,private,partner,habit,review,goals,together

## Review notes

Bond is a private ritual for two people who already know each other. There is no public feed.

Demo: sign in with the two review accounts below (already paired). Check in on the same calendar day on both devices to see reveal. Bond Plus is optional and is not required to see a partner’s already-opened day.

Sign in with Apple and email/password both work. Continue with Google is also offered.

Account deletion: Us → Delete account.

Notifications are optional.

## App Privacy (nutrition labels)

| Data | Linked to identity | Used for tracking | Purpose |
| --- | --- | --- | --- |
| Email | Yes | No | App functionality |
| Name | Yes | No | App functionality |
| User content (check-ins, goals, reviews) | Yes | No | App functionality |
| Device ID (Expo push token if they enable partner alerts; advertising ID on the free plan) | Yes | No | App functionality; third-party advertising (free plan) |

Not collected: precise location, contacts, photos, browsing history.

## Subscriptions

Create a subscription group **Bond Plus**, then:

| Product id | Reference name | Duration | Price |
| --- | --- | --- | --- |
| `bond_plus_monthly` | Bond Plus Monthly | 1 month | $5.99 |
| `bond_plus_annual` | Bond Plus Yearly | 1 year | $60 |

Do not add a second 7-day store intro offer unless you want it to stack with Bond’s in-app trial. Localization: one purchase unlocks both partners. Review screenshot of the paywall is allowed.

## After you create the App Store Connect app

1. Copy the numeric **Apple ID** from App Information.
2. Put it in `eas.json` under `submit.production.ios.ascAppId`.
3. Enable Sign in with Apple for bundle `com.bond.app` in the Apple Developer portal.
4. In Supabase → Authentication → Providers → Apple: turn it on and add Services ID / key plus audience `com.bond.app`.
5. Allow-list `bond://**` in Supabase Auth redirect URLs.

## Upload commands (after `eas login`)

```sh
cd ~/projects/bond   # or this repo
eas credentials --platform ios   # production; create distribution cert + ASC API key
npm run build:ios
npm run submit:ios
```

The IPA lands in TestFlight. Attach it to version 1.0.1, add two paired review accounts, then Submit for Review.
