/** Ad slots for unpaid/free accounts. Plus (trial, paid, grace) never sees ads. */

export const DAILY_OPEN_STORAGE_KEY = 'bond.ads.dailyOpenDay'
export const FEED_AD_INTERVAL = 3

/**
 * Google sample / test app and unit IDs.
 * Swap EXPO_PUBLIC_ADMOB_* (and app.json plugin app ids) for your AdMob units
 * before shipping paid inventory. Do not invent a publisher id here.
 */
export const ADMOB_TEST = {
  androidAppId: 'ca-app-pub-3940256099942544~3347511713',
  iosAppId: 'ca-app-pub-3940256099942544~1458002511',
  androidBanner: 'ca-app-pub-3940256099942544/6300978111',
  iosBanner: 'ca-app-pub-3940256099942544/2934735716',
  androidInterstitial: 'ca-app-pub-3940256099942544/1033173712',
  iosInterstitial: 'ca-app-pub-3940256099942544/4411468910',
} as const

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

export function bannerUnitId(os: string): string {
  const fromEnv = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID
  if (fromEnv) return fromEnv
  return os === 'ios' ? ADMOB_TEST.iosBanner : ADMOB_TEST.androidBanner
}

export function interstitialUnitId(os: string): string {
  const fromEnv = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID
  if (fromEnv) return fromEnv
  return os === 'ios' ? ADMOB_TEST.iosInterstitial : ADMOB_TEST.androidInterstitial
}

export const HOUSE_AD_KICKER = 'Advertisement'
export const HOUSE_AD_BODY =
  'Bond Plus removes ads — $4.99/month or $48/year for both of you.'
export const HOUSE_AD_CONTINUE = 'Continue'
export const HOUSE_AD_PLUS = 'See Bond Plus'
