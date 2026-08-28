import { useEffect, useRef, useState } from 'react'
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { HouseAd } from './HouseAd'
import { useBondPlus } from '../hooks/useBondPlus'
import {
  HOUSE_AD_CONTINUE,
  HOUSE_AD_KICKER,
  isNewLocalDay,
  shouldShowAds,
} from '../lib/ads'
import { showDailyInterstitial } from '../lib/admob'
import { readDailyOpenDay, writeDailyOpenDay } from '../lib/adsStorage'
import { localDateString } from '../lib/dates'
import { colors, hit, type } from '../lib/theme'

/**
 * One interstitial on the first open of the local calendar day for free accounts.
 * Bond Plus / trial skip this. Native AdMob is used when the module is linked;
 * otherwise a labeled house unit. Never mounts on privacy, help, or check-in.
 */
export function DailyOpenAd() {
  const plus = useBondPlus()
  const [houseVisible, setHouseVisible] = useState(false)
  const inflight = useRef(false)

  useEffect(() => {
    if (plus.isLoading) return
    if (!shouldShowAds(plus.active)) return

    let cancelled = false

    const maybeShow = async () => {
      if (inflight.current) return
      inflight.current = true
      try {
        const today = localDateString()
        const last = await readDailyOpenDay()
        if (cancelled || !isNewLocalDay(last, today)) return
        await writeDailyOpenDay(today)
        const nativeShown = await showDailyInterstitial()
        if (cancelled || nativeShown) return
        setHouseVisible(true)
      } finally {
        inflight.current = false
      }
    }

    const timer = setTimeout(() => {
      void maybeShow()
    }, 700)

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void maybeShow()
    })

    return () => {
      cancelled = true
      clearTimeout(timer)
      sub.remove()
    }
  }, [plus.active, plus.isLoading])

  if (!houseVisible) return null

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => setHouseVisible(false)}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View
          style={styles.sheet}
          accessibilityRole="alert"
          accessibilityLabel={HOUSE_AD_KICKER}
        >
          <HouseAd onPress={() => setHouseVisible(false)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={HOUSE_AD_CONTINUE}
            onPress={() => setHouseVisible(false)}
            style={(state) => [styles.secondary, state.pressed && styles.pressed]}
          >
            <Text style={styles.secondaryLabel}>{HOUSE_AD_CONTINUE}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
  },
  secondary: {
    minHeight: hit,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    ...type.body,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.85,
  },
})
