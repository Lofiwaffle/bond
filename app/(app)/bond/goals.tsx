import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import {
  Card,
  LoadingScreen,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { colors, radii } from '../../../lib/theme'

export default function BondGoalsScreen() {
  const { partner, isLoading } = useAuth()

  if (isLoading) return <LoadingScreen />

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <BondSectionHeader
          title="Goals"
          subtitle={
            partner
              ? `Shared targets with ${partner.display_name}.`
              : 'Shared targets you’re building toward together.'
          }
        />

        <Card>
          <Text style={styles.emptyTitle}>No goals yet</Text>
          <Text style={styles.emptyBody}>
            Goals are the bigger picture: trips, savings, rituals, projects.
            Habit Forge is a good place to log progress in the meantime.
          </Text>
          <PrimaryButton
            label="Open Habits"
            onPress={() => router.replace('/(app)/bond/habits')}
          />
          <View style={styles.spacer} />
          <SecondaryButton
            label="Back to Bond menu"
            onPress={() => router.back()}
          />
        </Card>

        <View style={styles.hintBox}>
          <Text style={styles.hintGlyph}>◉</Text>
          <Text style={styles.hintText}>
            Tip: log Forge when you make a material or financial move toward a
            shared goal.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 8 },
  emptyTitle: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 8,
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  spacer: { height: 8 },
  hintBox: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    backgroundColor: colors.bgSoft,
    padding: 12,
    marginTop: 8,
  },
  hintGlyph: {
    color: colors.accent,
    fontSize: 18,
    marginTop: 1,
  },
  hintText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
})
