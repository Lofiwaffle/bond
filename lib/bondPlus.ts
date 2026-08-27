/** Store products and copy for the couple-level Bond Plus entitlement. */

export const BOND_PLUS_ENTITLEMENT = 'bond_plus' as const

export const FOUNDING_COUPLE_CAP = 250
export const TRIAL_DAYS = 14
export const GRACE_DAYS = 16
export const FREE_HISTORY_DAYS = 7
export const OFFER_AFTER_REVEALS = 3
export const OFFER_SNOOZE_DAYS = 14

export type PlusPlan = 'trial' | 'monthly' | 'annual' | 'founding_annual'

export type PlusProductId =
  | 'bond_plus_monthly'
  | 'bond_plus_annual'
  | 'bond_plus_founding_annual'

export type PlusProduct = {
  id: PlusProductId
  plan: Exclude<PlusPlan, 'trial'>
  title: string
  priceLabel: string
  periodLabel: string
  appleProductId: string
  googleProductId: string
}

export const PLUS_PRODUCTS: PlusProduct[] = [
  {
    id: 'bond_plus_monthly',
    plan: 'monthly',
    title: 'Monthly',
    priceLabel: '$4.99',
    periodLabel: 'per couple / month',
    appleProductId: 'bond_plus_monthly',
    googleProductId: 'bond_plus_monthly',
  },
  {
    id: 'bond_plus_annual',
    plan: 'annual',
    title: 'Yearly',
    priceLabel: '$48',
    periodLabel: 'per couple / year',
    appleProductId: 'bond_plus_annual',
    googleProductId: 'bond_plus_annual',
  },
  {
    id: 'bond_plus_founding_annual',
    plan: 'founding_annual',
    title: 'Founding Couple',
    priceLabel: '$29.99',
    periodLabel: 'first year, then $48 / year',
    appleProductId: 'bond_plus_founding_annual',
    googleProductId: 'bond_plus_founding_annual',
  },
]

export function productById(id: PlusProductId): PlusProduct {
  const product = PLUS_PRODUCTS.find((item) => item.id === id)
  if (!product) throw new Error(`Unknown Bond Plus product: ${id}`)
  return product
}

export function productByPlan(plan: PlusPlan): PlusProduct | null {
  if (plan === 'trial') return null
  return PLUS_PRODUCTS.find((item) => item.plan === plan) ?? null
}

export type PlusFeature =
  | 'no_ads'
  | 'history_archive'
  | 'history_search'
  | 'weekly_review'
  | 'trends'
  | 'custom_prompts'
  | 'goals'
  | 'rituals'
  | 'milestones'
  | 'personalized_reminders'
  | 'ai_weekly_summary'

export const PLUS_FEATURES: Record<
  PlusFeature,
  { title: string; body: string }
> = {
  no_ads: {
    title: 'No ads',
    body: 'The free plan shows an ad when you open Bond the first time each day, and ads in History. Plus and the trial remove them.',
  },
  history_archive: {
    title: 'Complete history',
    body: 'Every opened day, not only the last week. Search labels and activities.',
  },
  history_search: {
    title: 'Search',
    body: 'Find a day by how connected it felt, or what you tagged.',
  },
  weekly_review: {
    title: 'State of Us',
    body: 'A weekly look back in your own words, then one small intention.',
  },
  trends: {
    title: 'Trends',
    body: 'Patterns in connection, communication, and recurring needs — not a verdict.',
  },
  custom_prompts: {
    title: 'Private prompt decks',
    body: 'Questions only the two of you see, alongside the daily ritual.',
  },
  goals: {
    title: 'Shared goals',
    body: 'Aims that become yours together after they agree.',
  },
  rituals: {
    title: 'Rituals and follow-up',
    body: 'Shared rhythms beyond the daily check-in.',
  },
  milestones: {
    title: 'Milestones',
    body: 'Special dates and constructive moments you already lived.',
  },
  personalized_reminders: {
    title: 'Personalized reminders',
    body: 'A suggested time from when you both usually show up.',
  },
  ai_weekly_summary: {
    title: 'Weekly reflection',
    body: 'Optional AI summary of a finished week. Reflection, not therapy.',
  },
}

export const PLUS_NAME = 'Bond Plus'

export const PLUS_SUBTITLE = 'Deeper growth for the two of you.'

export const PLUS_TRIAL_COPY = `14-day trial, offered after three days you both open.`

/** Paid StoreKit / Play Billing. Keep false until those products exist. */
export const PLUS_PAID_CHECKOUT_READY = false

export const PLUS_CHECKOUT_PENDING =
  'Paid Bond Plus plans bill through Google Play or the App Store. They are not for sale until that billing is live. The 14-day trial is free and does not charge you.'


export const PLUS_COUPLE_BILLING =
  'One purchase unlocks Bond Plus for both partners. The receipt stays with the person who paid.'

export const PLUS_TRUST_LINE =
  'You will never pay to see an answer your partner already shared with you.'

export const PLUS_FREE_LINES = [
  'Pairing and invitations',
  'Daily check-in and mutual reveal',
  'Basic reminders',
  'The last seven days of history',
  'Ads on first open of the day and in History',
  'Safety, privacy, export, deletion, and unpairing',
] as const

export const PLUS_LEGAL =
  'Bond Plus is an auto-renewing subscription per couple. Payment is charged to your Apple ID or Google Play account at confirmation. The subscription renews unless you cancel at least 24 hours before the period ends. Manage or cancel in your device’s subscription settings. The standard Apple EULA applies unless a custom Terms of Use is linked from the listing.'

export const APPLE_STANDARD_EULA =
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'

export const PLUS_UNPAIR_COPY =
  'If the person who paid leaves, Bond Plus pauses for that Bond. Their receipt can be restored onto a new Bond they join. The remaining partner keeps every answer already opened; they do not keep Plus.'

export type PlusFunnelEvent =
  | 'invite_sent'
  | 'partner_paired'
  | 'first_mutual_reveal'
  | 'third_mutual_reveal'
  | 'plus_preview_viewed'
  | 'trial_started'
  | 'subscription_purchased'
  | 'four_week_retained'
  | 'renewal'
  | 'cancellation'

export const ONCE_PER_COUPLE_EVENTS: PlusFunnelEvent[] = [
  'invite_sent',
  'partner_paired',
  'first_mutual_reveal',
  'third_mutual_reveal',
  'plus_preview_viewed',
  'trial_started',
  'subscription_purchased',
  'four_week_retained',
]
