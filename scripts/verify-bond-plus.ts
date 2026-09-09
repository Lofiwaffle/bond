/**
 * Bond Plus access rules and first insight.
 * Run: npx --yes tsx scripts/verify-bond-plus.ts
 */
import {
  FOUNDING_COUPLE_CAP,
  FREE_HISTORY_DAYS,
  LIFETIME_PROMO_CODE,
  OFFER_AFTER_REVEALS,
  PLUS_PAID_CHECKOUT_READY,
  PLUS_PAID_PLANS,
  PLUS_PRODUCTS,
  PLUS_STORE_SKUS,
  TRIAL_DAYS,
  annualSavingsLabel,
  isPaidStoreSku,
  normalizePromoCode,
  storeNameForPlatform,
  storePeriodEnd,
} from '../lib/bondPlus'
import { firstInsight } from '../lib/firstInsight'
import {
  inFreeHistoryWindow,
  isPlusActive,
  offerEligible,
  trialEligible,
} from '../lib/plusAccess'
import type { ObservationDay } from '../lib/growthObservations'

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(label)
}

assert('founding cap', FOUNDING_COUPLE_CAP === 250)
assert('trial days', TRIAL_DAYS === 7)
assert('history window', FREE_HISTORY_DAYS === 7)
assert('three products', PLUS_PRODUCTS.length === 3)
assert(
  'product ids',
  PLUS_PRODUCTS.map((p) => p.id).join(',') ===
    'bond_plus_monthly,bond_plus_annual,bond_plus_founding_annual',
)
assert('monthly price', PLUS_PRODUCTS[0].priceLabel === '$5.99')
assert('annual price', PLUS_PRODUCTS[1].priceLabel === '$60')
assert('founding then 60', PLUS_PRODUCTS[2].periodLabel.includes('$60'))
assert('paid checkout is on', PLUS_PAID_CHECKOUT_READY)
assert('paywall shows two plans', PLUS_PAID_PLANS.length === 2)
assert(
  'store skus',
  PLUS_STORE_SKUS.join(',') === 'bond_plus_monthly,bond_plus_annual',
)
assert('monthly is a store sku', isPaidStoreSku('bond_plus_monthly'))
assert('founding is not a store sku', !isPaidStoreSku('bond_plus_founding_annual'))
assert('android store is google', storeNameForPlatform('android') === 'google')
assert('ios store is apple', storeNameForPlatform('ios') === 'apple')
assert(
  'monthly period is about a month',
  storePeriodEnd('bond_plus_monthly', new Date('2026-01-15T00:00:00.000Z')).getTime() >=
    new Date('2026-02-14T00:00:00.000Z').getTime(),
)
assert(
  'annual period is about a year',
  storePeriodEnd('bond_plus_annual', new Date('2026-01-15T00:00:00.000Z')).getFullYear() ===
    2027,
)
assert('yearly saves vs monthly', annualSavingsLabel().includes('$12'))
assert(
  'promo code',
  normalizePromoCode(' 43V3R ') === LIFETIME_PROMO_CODE,
)

assert(
  'free window includes today',
  inFreeHistoryWindow('2026-08-27', '2026-08-27'),
)
assert(
  'free window includes day 7',
  inFreeHistoryWindow('2026-08-21', '2026-08-27'),
)
assert(
  'free window excludes day 8',
  !inFreeHistoryWindow('2026-08-20', '2026-08-27'),
)

assert(
  'trialing before end is active',
  isPlusActive({
    status: 'trialing',
    plan: 'trial',
    trialEndsAt: '2026-09-10T00:00:00.000Z',
    periodEndsAt: null,
    graceEndsAt: null,
    now: new Date('2026-09-01T00:00:00.000Z'),
  }),
)
assert(
  'trialing after end is inactive',
  !isPlusActive({
    status: 'trialing',
    plan: 'trial',
    trialEndsAt: '2026-08-01T00:00:00.000Z',
    periodEndsAt: null,
    graceEndsAt: null,
    now: new Date('2026-09-01T00:00:00.000Z'),
  }),
)
assert(
  'grace still active',
  isPlusActive({
    status: 'grace',
    plan: 'annual',
    trialEndsAt: null,
    periodEndsAt: '2026-08-01T00:00:00.000Z',
    graceEndsAt: '2026-09-10T00:00:00.000Z',
    now: new Date('2026-09-01T00:00:00.000Z'),
  }),
)
assert(
  'paused is never active',
  !isPlusActive({
    status: 'paused',
    plan: 'annual',
    trialEndsAt: null,
    periodEndsAt: '2026-12-01T00:00:00.000Z',
    graceEndsAt: null,
  }),
)

assert(
  'lifetime with no end is active',
  isPlusActive({
    status: 'active',
    plan: 'lifetime',
    trialEndsAt: null,
    periodEndsAt: null,
    graceEndsAt: null,
  }),
)

assert(
  'offer after three reveals',
  offerEligible({ mutualReveals: 3, active: false, snoozedUntil: null }),
)
assert(
  'no offer before three',
  !offerEligible({ mutualReveals: 2, active: false, snoozedUntil: null }),
)
assert(
  'no offer while plus is on',
  !offerEligible({ mutualReveals: 5, active: true, snoozedUntil: null }),
)
assert(
  'trial needs no prior trial',
  trialEligible({ active: false, hasTrialed: false }),
)
assert(
  'trial does not wait for three reveals',
  trialEligible({ mutualReveals: 0, active: false, hasTrialed: false }),
)
assert(
  'no second trial',
  !trialEligible({ mutualReveals: 10, active: false, hasTrialed: true }),
)

function day(
  date: string,
  mine: number,
  partner: number,
): ObservationDay {
  return { date, mine, partner, activities: [] }
}

assert(
  'no insight before three opens',
  firstInsight([day('2026-08-01', 4, 4), day('2026-08-02', 4, 5)]) === null,
)

const similar = firstInsight([
  day('2026-08-01', 4, 4),
  day('2026-08-02', 4, 5),
  day('2026-08-03', 3, 3),
])
assert('similar insight exists', Boolean(similar?.body.includes('similar')))
assert('offer after constant', OFFER_AFTER_REVEALS === 3)

const different = firstInsight([
  day('2026-08-01', 5, 1),
  day('2026-08-02', 5, 2),
  day('2026-08-03', 4, 1),
])
assert(
  'difference insight exists',
  Boolean(different?.body.includes('differ')),
)

console.log('bond plus ok')
