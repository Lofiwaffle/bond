# Bond Plus store products

Paid checkout uses Google Play Billing and StoreKit through `expo-iap`. The app asks the store for these **exact** product ids:

| Product id | Price | Period |
| --- | --- | --- |
| `bond_plus_monthly` | $5.99 | 1 month, auto-renew |
| `bond_plus_annual` | $60 | 1 year, auto-renew |

Package / bundle:

- Android: `com.bondcouple.app`
- iOS: `com.bond.app`

The 7-day limited free offer is Bond’s in-app trial (`start_plus_trial`) after pairing. Do **not** add a second 7-day introductory offer on the store products unless you want the purchase sheet to also say free trial (that would stack with the in-app offer).

This environment cannot create Play Console or App Store Connect records. Create them in those consoles, then ship a store build so `fetchProducts` can see them.

## Google Play Console

1. Open [Play Console](https://play.google.com/console) → the Bond app (`com.bondcouple.app`).
2. Monetize → Products → Subscriptions → Create subscription.
3. Product ID: `bond_plus_monthly` (permanent). Name: **Bond Plus Monthly**. Description: Bond Plus for both partners. Auto-renews monthly.
4. Add a base plan. Base plan ID can be `monthly`. Renewal: every 1 month. Price: **$5.99 USD**.
5. Activate the base plan, then activate the subscription.
6. Repeat for `bond_plus_annual`: base plan ID `yearly`, every 1 year, **$60 USD**.
7. License testing: Setup → License testing → add Gmail accounts that should buy without being charged.

Play only returns these SKUs after:

- The subscriptions are **Active** (not draft-only)
- A signed AAB that includes the Play Billing library is on a testing track
- The tester’s account is a license tester (or a real purchaser)

## App Store Connect

1. Open the Bond iOS app (`com.bond.app`).
2. Monetization → Subscriptions → create a subscription group named **Bond Plus**.
3. Add subscription. Product ID: `bond_plus_monthly`. Reference name: Bond Plus Monthly. Duration: 1 month. Price: **$5.99**.
4. Localization: display name **Bond Plus Monthly**, description that one purchase unlocks both partners.
5. Repeat for `bond_plus_annual`, duration 1 year, **$60**.
6. Submit the subscriptions with the next iOS binary (or as metadata if Apple asks). Sandbox testers: Users and Access → Sandbox.

## After the products exist

1. Paste `supabase/catchup_plus_store.sql` in the hosted SQL editor so checkout can grant Plus.
2. From `~/projects/bond` after `eas login`:

```sh
npm run build:android   # production AAB
npm run build:ios       # production IPA
```

Keep the existing Play upload key (`SHA1 88:54:EE:F1:…`). Do not generate a new Android keystore.

3. Internal testing / TestFlight: choose yearly or monthly on Bond Plus. The Play/App Store sheet should open. After a successful purchase, both partners get Plus.

Until the consoles have those SKUs, choosing a paid plan still explains that the store does not have Bond Plus on this device yet. The 7-day trial does not charge.
