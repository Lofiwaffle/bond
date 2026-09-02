/**
 * Free-plan ad eligibility. Run: npx --yes tsx scripts/verify-ads.ts
 */
import {
  FEED_AD_INTERVAL,
  HOUSE_AD_BODY,
  bannerUnitId,
  isGoogleTestAdId,
  isNewLocalDay,
  shouldInsertFeedAd,
  shouldShowAds,
} from '../lib/ads'
import { PLUS_PRODUCTS } from '../lib/bondPlus'

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(label)
}

assert('plus active skips ads', shouldShowAds(true) === false)
assert('free sees ads', shouldShowAds(false) === true)
assert('new day when never shown', isNewLocalDay(null, '2026-08-27'))
assert('same day is not new', isNewLocalDay('2026-08-27', '2026-08-27') === false)
assert('next calendar day is new', isNewLocalDay('2026-08-26', '2026-08-27'))
assert('feed ad at 0', shouldInsertFeedAd(0))
assert('no feed ad at 1', shouldInsertFeedAd(1) === false)
assert('feed ad at interval', shouldInsertFeedAd(FEED_AD_INTERVAL))
assert('negative index skipped', shouldInsertFeedAd(-1) === false)
assert('monthly is 4.99', PLUS_PRODUCTS[0].priceLabel === '$4.99')
assert('annual is 48', PLUS_PRODUCTS[1].priceLabel === '$48')
assert(
  'founding then 48',
  PLUS_PRODUCTS[2].periodLabel.includes('$48'),
)
assert('house copy names yearly price', HOUSE_AD_BODY.includes('$48'))
assert(
  'google sample id is detected',
  isGoogleTestAdId('ca-app-pub-3940256099942544/6300978111'),
)
assert(
  'real-looking id is not a sample',
  isGoogleTestAdId('ca-app-pub-1234567890123456/1234567890') === false,
)
const previousEnv = process.env.APP_ENV
process.env.APP_ENV = 'production'
delete process.env.EXPO_PUBLIC_ADMOB_BANNER_ID
assert(
  'production without paid units is quiet',
  bannerUnitId('android') === null,
)
process.env.APP_ENV = previousEnv

console.log('verify-ads: ok')
