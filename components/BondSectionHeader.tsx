import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { Title } from './ui'
import { colors, radii } from '../lib/theme'

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
        accessibilityLabel="Back to Bond"
        onPress={() => router.back()}
        style={styles.backBtn}
      >
        <Text style={styles.backText}>‹ Bond</Text>
      </Pressable>
      <Title>{title}</Title>
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
    borderWidth: 0,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
    backgroundColor: colors.accentSoft,
  },
  backText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: -4,
    marginBottom: 16,
  },
})
