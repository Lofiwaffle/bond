import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { Icon } from '../lib/icons'
import { colors, hit, type } from '../lib/theme'

export function BondSectionHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Growth"
        onPress={() => router.back()}
        hitSlop={8}
        style={styles.backBtn}
      >
        <Icon name="chevron-left" size={16} color={colors.muted} />
        <Text style={styles.backText}>Growth</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: hit,
    paddingVertical: 12,
    marginBottom: 8,
  },
  backText: {
    ...type.label,
    marginBottom: 0,
  },
  title: {
    ...type.heading,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 16,
  },
})
