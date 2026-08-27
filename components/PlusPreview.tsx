import { useEffect, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router, type Href } from 'expo-router'

import { useBondPlus } from '../hooks/useBondPlus'
import {
  OFFER_AFTER_REVEALS,
  PLUS_FEATURES,
  PLUS_TRUST_LINE,
  type PlusFeature,
} from '../lib/bondPlus'
import { colors, type } from '../lib/theme'
import { LoadingScreen, PrimaryButton, Screen, TextLink } from './ui'

export function PlusPreview({
  feature,
  children,
}: {
  feature: PlusFeature
  children: ReactNode
}) {
  const plus = useBondPlus()
  const copy = PLUS_FEATURES[feature]

  useEffect(() => {
    if (!plus.isLoading && plus.offerEligible) {
      void plus.markPreviewViewed()
    }
  }, [plus.isLoading, plus.offerEligible, plus.markPreviewViewed])

  if (plus.isLoading) return <LoadingScreen />
  if (plus.active) return <>{children}</>

  const remaining = Math.max(0, OFFER_AFTER_REVEALS - plus.mutualReveals)
  const ready = remaining === 0

  return (
    <Screen>
      <Text style={styles.kicker}>Bond Plus</Text>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      {ready ? (
        <Text style={styles.trust}>{PLUS_TRUST_LINE}</Text>
      ) : (
        <Text style={styles.trust}>
          Opens after {remaining} more day{remaining === 1 ? '' : 's'} you both
          reveal. The daily check-in stays free.
        </Text>
      )}
      {ready ? (
        <PrimaryButton
          label="See Bond Plus"
          onPress={() => router.push('/(app)/plus' as Href)}
        />
      ) : (
        <PrimaryButton
          label="Back to Today"
          onPress={() => router.replace('/(app)/(tabs)')}
        />
      )}
      <View style={styles.back}>
        <TextLink label="Not now" onPress={() => router.back()} />
      </View>
    </Screen>
  )
}

export function plusGate(
  feature: PlusFeature,
  plus: { isLoading: boolean; active: boolean },
) {
  if (plus.isLoading) return <LoadingScreen />
  if (!plus.active) {
    return <PlusPreview feature={feature}>{null}</PlusPreview>
  }
  return null
}

const styles = StyleSheet.create({
  kicker: {
    ...type.label,
    color: colors.accentFill,
    marginBottom: 4,
  },
  title: {
    ...type.heading,
    marginBottom: 8,
  },
  body: {
    ...type.body,
    marginBottom: 12,
  },
  trust: {
    ...type.body,
    color: colors.muted,
    marginBottom: 20,
  },
  back: {
    marginTop: 12,
  },
})
