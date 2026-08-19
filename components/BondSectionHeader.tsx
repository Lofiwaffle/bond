import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { Screen, Title } from './ui'
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
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
    backgroundColor: colors.bgSoft,
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
