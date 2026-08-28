import { Platform } from 'react-native'

import { interstitialUnitId } from './ads'
import type { AdmobModule } from './admobTypes'

let cached: AdmobModule | null | undefined

export function getAdmob(): AdmobModule | null {
  if (cached !== undefined) return cached
  try {
    // Expo Go has no native module; a static import would crash there.
    cached = require('react-native-google-mobile-ads') as AdmobModule
  } catch {
    cached = null
  }
  return cached
}

export async function showDailyInterstitial(): Promise<boolean> {
  const ads = getAdmob()
  if (!ads) return false
  try {
    await ads.MobileAds().initialize()
    const interstitial = ads.InterstitialAd.createForAdRequest(
      interstitialUnitId(Platform.OS),
      { requestNonPersonalizedAdsOnly: true },
    )
    return await new Promise((resolve) => {
      const finish = (shown: boolean) => {
        clearTimeout(timer)
        unsubLoaded()
        unsubError()
        resolve(shown)
      }
      const timer = setTimeout(() => finish(false), 4000)
      const unsubLoaded = interstitial.addAdEventListener(
        ads.AdEventType.LOADED,
        () => {
          interstitial
            .show()
            .then(() => finish(true))
            .catch(() => finish(false))
        },
      )
      const unsubError = interstitial.addAdEventListener(
        ads.AdEventType.ERROR,
        () => finish(false),
      )
      interstitial.load()
    })
  } catch {
    return false
  }
}
