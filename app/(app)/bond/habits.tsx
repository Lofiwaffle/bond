import { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import {
  Card,
  ErrorText,
  Field,
  HabitCalendar,
  LoadingScreen,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '../../../components/ui'
import { useHabitBadges } from '../../../hooks/useHabitBadges'
import { useAuth } from '../../../lib/auth'
import { badgesForProgress, type BadgeId } from '../../../lib/badges'
import { colors, radii } from '../../../lib/theme'

export default function BondHabitsScreen() {
  const { partner, isLoading: authLoading } = useAuth()
  const {
    counts,
    completions,
    isLoading,
    logHabit,
    refresh,
  } = useHabitBadges()

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

        <Card>
          <Text style={styles.sectionTitle}>Habit calendar</Text>
          <Text style={styles.sectionHint}>
            One chart for every habit. Color matches the key. Tap a habit to
            log it.
          </Text>
          <HabitCalendar completions={completions} onPressHabit={openHabit} />
        </Card>

        {activeBadge ? (
          <Card style={styles.activeCard}>
            <Text style={styles.sectionTitle}>
              <Text style={{ color: activeBadge.color }}>
                {activeBadge.glyph}{' '}
              </Text>
              {activeBadge.label}
            </Text>
            <Text style={styles.sectionHint}>{activeBadge.quest}</Text>
            <Field
              value={habitNote}
              onChangeText={setHabitNote}
              placeholder="Optional note…"
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
            <SecondaryButton label="Cancel" onPress={closeHabit} />
          </Card>
        ) : null}

        <SecondaryButton label="Refresh" onPress={() => void refresh()} />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 8,
  },
  sectionTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  activeCard: {
    backgroundColor: colors.accentSoft,
  },
  note: {
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 8,
    borderRadius: radii.md,
  },
})
