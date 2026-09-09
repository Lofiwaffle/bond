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

Paid checkout uses Google Play Billing or StoreKit (`expo-iap`) with product ids `bond_plus_monthly` and `bond_plus_annual`. Create those subscriptions in the consoles, then ship a store build. Exact click-path: [store-products.md](store-products.md).

Native IAP belongs in a development or production build, not Expo Go. Web still explains that paid plans bill in the Bond app; the 7-day trial works on web.

If `fetchProducts` cannot see the SKUs yet, the paywall explains that the store does not have Bond Plus on this device. After a successful store purchase, `claim_plus_store_purchase` grants Plus to the couple.

Hosted SQL: paste `supabase/catchup_plus_pricing.sql` and `supabase/catchup_plus_store.sql` (or apply the matching migrations) so the trial lasts 7 days and paid checkout can grant Plus.

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

Files: `supabase/migrations/20260909120000_plus_pricing.sql`, `supabase/catchup_plus_pricing.sql`, `supabase/migrations/20260909140000_claim_plus_store_purchase.sql`, `supabase/catchup_plus_store.sql`
