/**
 * Free-plan ad eligibility. Run: npx --yes tsx scripts/verify-ads.ts
 */
import {
  FEED_AD_INTERVAL,
  HOUSE_AD_BODY,
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

console.log('verify-ads: ok')
