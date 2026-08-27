import { StyleSheet, Text, View } from 'react-native'

import {
  OBSERVATION_DISCLAIMER,
  type GrowthObservation,
} from '../lib/growthObservations'
import { colors, type } from '../lib/theme'

export function GrowthObservations({
  observations,
  lockedHint,
}: {
  observations: GrowthObservation[]
  lockedHint?: string
}) {
  if (observations.length === 0) {
    if (!lockedHint) return null
    return (
      <View style={styles.section}>
        <Text style={styles.title}>What we noticed</Text>
        <Text style={styles.hint}>{lockedHint}</Text>
      </View>
    )
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>What we noticed</Text>
      <Text style={styles.hint}>{OBSERVATION_DISCLAIMER}</Text>
      {observations.map((item) => (
        <Text key={item.id} style={styles.body}>
          {item.body}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 16,
  },
  title: {
    ...type.heading,
    marginBottom: 4,
  },
  hint: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  body: {
    ...type.body,
    marginBottom: 10,
  },
})
