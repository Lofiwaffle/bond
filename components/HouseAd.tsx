import { Pressable, StyleSheet, Text } from 'react-native'
import { router, type Href } from 'expo-router'

import {
  HOUSE_AD_BODY,
  HOUSE_AD_KICKER,
  HOUSE_AD_PLUS,
} from '../lib/ads'
import { colors, radii, type } from '../lib/theme'

export function HouseAd({
  compact,
  onPress,
}: {
  compact?: boolean
  onPress?: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${HOUSE_AD_KICKER}. ${HOUSE_AD_BODY} ${HOUSE_AD_PLUS}`}
      onPress={() => {
        onPress?.()
        router.push('/(app)/plus' as Href)
      }}
      style={(state) => [
        styles.card,
        compact && styles.compact,
        state.pressed && styles.pressed,
      ]}
    >
      <Text style={styles.kicker}>{HOUSE_AD_KICKER}</Text>
      <Text style={styles.body}>{HOUSE_AD_BODY}</Text>
      <Text style={styles.cta}>{HOUSE_AD_PLUS}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginVertical: 10,
  },
  compact: {
    marginVertical: 8,
    padding: 12,
  },
  kicker: {
    ...type.label,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 4,
  },
  body: {
    ...type.body,
    color: colors.ink,
  },
  cta: {
    ...type.label,
    color: colors.accentFill,
    fontWeight: '500',
    marginTop: 8,
  },
  pressed: {
    opacity: 0.85,
  },
})
