import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import {
  ErrorText,
  Field,
  HabitCalendar,
  LoadingScreen,
  PrimaryButton,
  Screen,
  TextLink,
} from '../../../components/ui'
import { useHabitBadges } from '../../../hooks/useHabitBadges'
import { useAuth } from '../../../lib/auth'
import { badgesForProgress, type BadgeId } from '../../../lib/badges'
import { Icon } from '../../../lib/icons'
import { colors, hairlineWidth, radii, type } from '../../../lib/theme'

export default function BondHabitsScreen() {
  const { partner, isLoading: authLoading } = useAuth()
  const { counts, completions, isLoading, logHabit } = useHabitBadges()

  const [activeHabitId, setActiveHabitId] = useState<BadgeId | null>(null)
  const [habitNote, setHabitNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (authLoading || isLoading) return <LoadingScreen />

  const badges = badgesForProgress({ completions: counts })
  const activeBadge = badges.find((b) => b.id === activeHabitId) ?? null
  const earnedCount = badges.filter((b) => b.earned).length

  const openHabit = (id: BadgeId) => {
    setActiveHabitId(id)
    setHabitNote('')
    setError(null)
  }

  const closeHabit = () => {
    setActiveHabitId(null)
    setHabitNote('')
    setError(null)
  }

  const onLogHabit = async () => {
    if (!activeHabitId) return
    setSubmitting(true)
    const result = await logHabit(activeHabitId, habitNote)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    closeHabit()
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <BondSectionHeader
          title="Habits"
          subtitle={
            partner
              ? `Log real moments with ${partner.display_name}. ${earnedCount}/5 unlocked.`
              : `Log real moments together. ${earnedCount}/5 unlocked.`
          }
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habit calendar</Text>
          <Text style={styles.sectionHint}>
            One chart for every habit. Tap a habit to log it.
          </Text>
          <HabitCalendar completions={completions} onPressHabit={openHabit} />
        </View>

        {activeBadge ? (
          <View style={styles.sectionLast}>
            <View style={styles.activeTitle}>
              <Icon name={activeBadge.icon} size={18} color={colors.ink} />
              <Text style={styles.sectionTitle}>{activeBadge.label}</Text>
            </View>
            <Text style={styles.sectionHint}>{activeBadge.quest}</Text>
            <Field
              value={habitNote}
              onChangeText={setHabitNote}
              placeholder="Optional note"
              autoCapitalize="sentences"
              multiline
              style={styles.note}
            />
            <ErrorText message={error} />
            <PrimaryButton
              label="Log it"
              onPress={onLogHabit}
              loading={submitting}
            />
            <TextLink label="Cancel" onPress={closeHabit} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 8,
  },
  section: {
    paddingVertical: 8,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
    marginBottom: 8,
  },
  sectionLast: {
    paddingVertical: 16,
  },
  sectionTitle: {
    ...type.heading,
    marginBottom: 4,
  },
  activeTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionHint: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  note: {
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 8,
    borderRadius: radii.md,
  },
})
