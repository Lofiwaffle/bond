import { useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'

import { HouseAd } from './HouseAd'
import { useBondPlus } from '../hooks/useBondPlus'
import { HOUSE_AD_KICKER, bannerUnitId, shouldShowAds } from '../lib/ads'
import { getAdmob } from '../lib/admob'
import { colors, type } from '../lib/theme'

export function FeedAd() {
  const plus = useBondPlus()
  const ads = getAdmob()
  const [nativeFailed, setNativeFailed] = useState(!ads)

  if (plus.isLoading || !shouldShowAds(plus.active)) return null

  const unitId = bannerUnitId(Platform.OS)
  if (nativeFailed || !ads || !unitId) return <HouseAd compact />

  const { BannerAd, BannerAdSize } = ads
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={HOUSE_AD_KICKER}
      style={styles.wrap}
    >
      <Text style={styles.kicker}>{HOUSE_AD_KICKER}</Text>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.INLINE_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setNativeFailed(true)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginVertical: 10,
    overflow: 'hidden',
  },
  kicker: {
    ...type.label,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.muted,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
})
