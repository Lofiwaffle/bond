# Bond Plus

Couple-level subscription. One purchase unlocks Plus for both partners. The receipt stays with the purchaser.

You never pay to see an answer a partner already shared.

Bond ships the first Play release **without** paid checkout (`PLUS_PAID_CHECKOUT_READY` is false) so Google Play Billing is not required yet. The 14-day trial can still run after three mutual reveals.

## Products

Create these in App Store Connect and Play Console, then map them to the `bond_plus` entitlement.

| Product id | Price | Notes |
| --- | --- | --- |
| `bond_plus_monthly` | $4.99 / month | Auto-renew |
| `bond_plus_annual` | $48 / year | Auto-renew |
| `bond_plus_founding_annual` | $29.99 first year | Cap 250 couples, then $48 / year |

Trial: 14 days, only after **three mutual reveals**. Not offered earlier.

Grace: 16 days after a paid period ends. Plus stays on during grace.

## Free vs Plus

Always free: pairing, daily check-in, mutual reveal, basic reminders, last seven days of history, safety, privacy, export, delete, unpair, and any already-opened day’s answers. The free plan shows an ad on first open each day and ads in History.

Plus: no ads, full archive and search, weekly State of Us, trends, private prompt decks, shared goals, milestones, personalized reminder suggestions, optional AI weekly reflection.

## Unpair

If the purchaser leaves, Plus pauses on that Bond. Their receipt can be restored onto a new Bond they join. The remaining partner keeps opened answers and does not keep Plus.

If the non-purchaser leaves, Plus stays with the purchaser’s Bond.

## Store checkout

Paid checkout needs App Store / Play products plus a service-role webhook that calls `apply_plus_purchase`. Until those exist, the paywall still starts the 14-day trial.

Native IAP belongs in a development or production build, not Expo Go. See [Expo in-app purchases](https://docs.expo.dev/guides/in-app-purchases/).

## Ads (free plan)

Unpaid accounts see:

1. One interstitial the first time they open Bond that local calendar day
2. Banner units in History (every three days in the list)

Bond Plus, trial, and grace skip ads. Ads are not shown on login, onboarding, check-in compose, privacy, help, or crisis pages.

Native builds use `react-native-google-mobile-ads` with Google’s published **test** app IDs until you replace them with your AdMob app IDs in `app.json` and unit IDs via `EXPO_PUBLIC_ADMOB_BANNER_ID` / `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID`. Do not invent a publisher id. Expo Go and web fall back to a labeled house unit that opens Bond Plus.

Play listing: Ads **Yes**. Advertising ID is used for ads. Privacy policy must stay in sync.

## Funnel

`invite_sent` → `partner_paired` → `first_mutual_reveal` → `third_mutual_reveal` → `plus_preview_viewed` → `trial_started` → `subscription_purchased` → `four_week_retained` → `renewal` / `cancellation`

## Apply the migration

```sh
# hosted SQL editor, or:
supabase db push
```

File: `supabase/migrations/20260827120000_bond_plus.sql`
