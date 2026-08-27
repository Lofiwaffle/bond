import { StyleSheet, Text, View } from 'react-native'
import { router, type Href } from 'expo-router'

import { NextStepCard } from './NextStepCard'
import { TextLink } from './ui'
import { PLUS_TRIAL_COPY, PLUS_TRUST_LINE } from '../lib/bondPlus'
import type { FirstInsight } from '../lib/firstInsight'
import { colors, type } from '../lib/theme'

export function PlusOfferCard({
  insight,
  onNotNow,
}: {
  insight: FirstInsight
  onNotNow: () => void
}) {
  return (
    <View style={styles.wrap}>
      <NextStepCard
        kicker="We noticed"
        title={insight.title}
        body={insight.body}
        actionLabel="See Bond Plus"
        onAction={() => router.push('/(app)/plus' as Href)}
      />
      <Text style={styles.meta}>
        {PLUS_TRIAL_COPY} {PLUS_TRUST_LINE}
      </Text>
      <TextLink label="Not now" onPress={onNotNow} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  meta: {
    ...type.label,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 4,
  },
})
