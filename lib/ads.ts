/** Ad slots for unpaid/free accounts. Plus (trial, paid, grace) never sees ads. */

export const DAILY_OPEN_STORAGE_KEY = 'bond.ads.dailyOpenDay'
export const FEED_AD_INTERVAL = 3

/**
 * Google sample / test app and unit IDs.
 * Production never requests these. Set EXPO_PUBLIC_ADMOB_* (and app ids in
 * EAS secrets) for paid inventory. Do not invent a publisher id here.
 */
export const ADMOB_TEST = {
  androidAppId: 'ca-app-pub-3940256099942544~3347511713',
  iosAppId: 'ca-app-pub-3940256099942544~1458002511',
  androidBanner: 'ca-app-pub-3940256099942544/6300978111',
  iosBanner: 'ca-app-pub-3940256099942544/2934735716',
  androidInterstitial: 'ca-app-pub-3940256099942544/1033173712',
  iosInterstitial: 'ca-app-pub-3940256099942544/4411468910',
} as const

export function isGoogleTestAdId(id: string | undefined | null): boolean {
  return Boolean(id && id.includes('3940256099942544'))
}

export function isProductionBuild(): boolean {
  return process.env.APP_ENV === 'production'
}

function paidAdUnit(
  fromEnv: string | undefined,
  testId: string,
): string | null {
  if (fromEnv && !isGoogleTestAdId(fromEnv)) return fromEnv
  if (isProductionBuild()) return null
  return fromEnv || testId
}

export function shouldShowAds(plusActive: boolean): boolean {
  return !plusActive
}

export function isNewLocalDay(
  lastShownDay: string | null,
  today: string,
): boolean {
  return Boolean(today) && lastShownDay !== today
}

/** Insert a feed unit before items 0, 3, 6, … */
export function shouldInsertFeedAd(
  index: number,
  interval = FEED_AD_INTERVAL,
): boolean {
  if (index < 0 || interval < 1) return false
  return index % interval === 0
}

export function bannerUnitId(os: string): string | null {
  return paidAdUnit(
    process.env.EXPO_PUBLIC_ADMOB_BANNER_ID,
    os === 'ios' ? ADMOB_TEST.iosBanner : ADMOB_TEST.androidBanner,
  )
}

export function interstitialUnitId(os: string): string | null {
  return paidAdUnit(
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID,
    os === 'ios' ? ADMOB_TEST.iosInterstitial : ADMOB_TEST.androidInterstitial,
  )
}

export const HOUSE_AD_KICKER = 'Advertisement'
export const HOUSE_AD_BODY =
  'Bond Plus removes ads — $4.99/month or $48/year for both of you.'
export const HOUSE_AD_CONTINUE = 'Continue'
export const HOUSE_AD_PLUS = 'See Bond Plus'
