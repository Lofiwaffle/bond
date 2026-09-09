import { useEffect, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router, type Href } from 'expo-router'

import { useBondPlus } from '../hooks/useBondPlus'
import {
  PLUS_FEATURES,
  PLUS_PAID_CHECKOUT_READY,
  PLUS_TRIAL_COPY,
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
    if (!plus.isLoading && !plus.active) {
      void plus.markPreviewViewed()
    }
  }, [plus.isLoading, plus.active, plus.markPreviewViewed])

  if (plus.isLoading) return <LoadingScreen />
  if (plus.active || !PLUS_PAID_CHECKOUT_READY) return <>{children}</>

  return (
    <Screen>
      <Text style={styles.kicker}>Bond Plus</Text>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      <Text style={styles.trust}>{PLUS_TRIAL_COPY}</Text>
      <Text style={styles.trust}>{PLUS_TRUST_LINE}</Text>
      <PrimaryButton
        label="See Bond Plus"
        onPress={() => router.push('/(app)/plus' as Href)}
      />
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
  if (plus.active || !PLUS_PAID_CHECKOUT_READY) return null
  return <PlusPreview feature={feature}>{null}</PlusPreview>
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
    marginBottom: 12,
  },
  back: {
    marginTop: 12,
  },
})
