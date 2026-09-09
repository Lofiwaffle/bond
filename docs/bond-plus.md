# Bond Plus

Couple-level subscription. One purchase unlocks Plus for both partners. The receipt stays with the purchaser.

You never pay to see an answer a partner already shared.

Growth features (full history, State of Us, trends, prompt decks, goals, personalized reminders, no ads) require Bond Plus. Daily check-in, pairing, and the last seven days of history stay free.

## Products

Create these in App Store Connect and Play Console, then map them to the `bond_plus` entitlement.

| Product id | Price | Notes |
| --- | --- | --- |
| `bond_plus_monthly` | $5.99 / month | Auto-renew |
| `bond_plus_annual` | $60 / year | Auto-renew |

Trial: **7-day limited free offer**, once per Bond, after the couple is paired. It does not wait for three mutual reveals.

Grace: 16 days after a paid period ends. Plus stays on during grace.

## Free vs Plus

Always free: pairing, daily check-in, mutual reveal, basic reminders, last seven days of history, safety, privacy, export, delete, unpair, and any already-opened day’s answers. The free plan shows an ad on first open each day and ads in History.

Plus: no ads, full archive and search, weekly State of Us, trends, private prompt decks, shared goals, milestones, personalized reminder suggestions, optional AI weekly reflection.

## Unpair

If the purchaser leaves, Plus pauses on that Bond. Their receipt can be restored onto a new Bond they join. The remaining partner keeps opened answers and does not keep Plus.

If the non-purchaser leaves, Plus stays with the purchaser’s Bond.

## Promo code

Us → Purchases accepts a promo code. `43v3r` grants **lifetime** Bond Plus for that Bond (no expiry, ads off). The person who applies it is the purchaser. Unpair and restore follow the same receipt rules as a paid plan.

## Store checkout

Paid checkout uses Google Play Billing or StoreKit. Create `bond_plus_monthly` and `bond_plus_annual` in the consoles, then ship a store build. Until those products exist, the paywall still starts the 7-day trial; choosing a paid plan explains that billing finishes in the Bond app.

Native IAP belongs in a development or production build, not Expo Go. See [Expo in-app purchases](https://docs.expo.dev/guides/in-app-purchases/).

Hosted SQL: paste `supabase/catchup_plus_pricing.sql` (or apply `supabase/migrations/20260909120000_plus_pricing.sql`) so the trial lasts 7 days and opens after pairing.

## Ads (free plan)

Unpaid accounts see:

1. One interstitial the first time they open Bond that local calendar day
2. Banner units in History (every three days in the list)

Bond Plus, trial, and grace skip ads. Ads are not shown on login, onboarding, check-in compose, privacy, help, or crisis pages.

Native builds use `react-native-google-mobile-ads` with Google’s published **test** app IDs until you replace them with your AdMob app IDs in `app.json` and unit IDs via `EXPO_PUBLIC_ADMOB_BANNER_ID` / `EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID`. Do not invent a publisher id. Expo Go and web fall back to a labeled house unit that opens Bond Plus.

Play listing: Ads **Yes**. Advertising ID is used for ads. Privacy policy must stay in sync. Declare in-app subscriptions at $5.99/month and $60/year with a 7-day free trial.

## Funnel

`invite_sent` → `partner_paired` → `trial_started` → `plus_preview_viewed` → `subscription_purchased` → `four_week_retained` → `renewal` / `cancellation`

## Apply the migration

```sh
# hosted SQL editor, or:
supabase db push
```

Files: `supabase/migrations/20260909120000_plus_pricing.sql` or `supabase/catchup_plus_pricing.sql`
