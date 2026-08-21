import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import {
  AchievementCalendar,
  ErrorText,
  Field,
  LoadingScreen,
  PrimaryButton,
  Screen,
  TextLink,
} from '../../../components/ui'
import { useHabitBadges } from '../../../hooks/useHabitBadges'
import { useAuth } from '../../../lib/auth'
import {
  BADGES,
  badgesForProgress,
  habitLocalDate,
  type BadgeId,
} from '../../../lib/badges'
import { formatDisplayDate, localDateString } from '../../../lib/dates'
import { Icon } from '../../../lib/icons'
import { colors, hairlineWidth, radii, type } from '../../../lib/theme'

const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b])) as Record<
  BadgeId,
  (typeof BADGES)[number]
>

export default function BondAchievementsScreen() {
  const { user, partner, isLoading: authLoading } = useAuth()
  const { counts, completions, isLoading, logHabit } = useHabitBadges()

  const [activeHabitId, setActiveHabitId] = useState<BadgeId | null>(null)
  const [habitNote, setHabitNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(localDateString())

  if (authLoading || isLoading) return <LoadingScreen />

  const badges = badgesForProgress({ completions: counts })
  const activeBadge = badges.find((b) => b.id === activeHabitId) ?? null
  const earnedCount = badges.filter((b) => b.earned).length

  const selectedEntries = completions.filter(
    (row) => habitLocalDate(row.created_at) === selectedDate,
  )

  const openAchievement = (id: BadgeId) => {
    setActiveHabitId(id)
    setHabitNote('')
    setError(null)
  }

  const closeAchievement = () => {
    setActiveHabitId(null)
    setHabitNote('')
    setError(null)
  }

  const onLogAchievement = async () => {
    if (!activeHabitId) return
    setSubmitting(true)
    const result = await logHabit(activeHabitId, habitNote)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSelectedDate(localDateString())
    closeAchievement()
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BondSectionHeader
          title="Achievements"
          subtitle={
            partner
              ? `Milestones you unlock with ${partner.display_name}. ${earnedCount}/5 earned.`
              : `Milestones you unlock together. ${earnedCount}/5 earned.`
          }
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendar</Text>
          <Text style={styles.sectionHint}>
            Tap a day to read the note. Tap a badge below to log a new one.
          </Text>
          <AchievementCalendar
            completions={completions}
            selectedDate={selectedDate}
            onPressDate={setSelectedDate}
            onPressAchievement={openAchievement}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedDate === localDateString()
              ? 'Today'
              : formatDisplayDate(selectedDate)}
          </Text>
          {selectedEntries.length === 0 ? (
            <Text style={styles.sectionHint}>
              Nothing logged this day yet.
            </Text>
          ) : (
            selectedEntries.map((completion) => (
              <AchievementNote
                key={completion.id}
                habitId={completion.habit_id as BadgeId}
                note={completion.note}
                author={
                  completion.user_id === user?.id
                    ? 'You'
                    : (partner?.display_name ?? 'Partner')
                }
              />
            ))
          )}
        </View>

        {activeBadge ? (
          <View style={styles.section}>
            <View style={styles.activeTitle}>
              <Icon name={activeBadge.icon} size={18} color={colors.ink} />
              <Text style={styles.sectionTitle}>{activeBadge.label}</Text>
            </View>
            <Text style={styles.sectionHint}>{activeBadge.quest}</Text>
            <Text style={styles.fieldLabel}>Note</Text>
            <Field
              value={habitNote}
              onChangeText={setHabitNote}
              placeholder="What happened? This note shows on the calendar."
              autoCapitalize="sentences"
              autoCorrect
              multiline
              style={styles.note}
            />
            <ErrorText message={error} />
            <PrimaryButton
              label="Save achievement"
              onPress={() => void onLogAchievement()}
              loading={submitting}
            />
            <TextLink label="Cancel" onPress={closeAchievement} />
          </View>
        ) : null}

        <View style={styles.sectionLast}>
          <Text style={styles.sectionTitle}>All notes</Text>
          <Text style={styles.sectionHint}>
            Every achievement you and your partner have written down.
          </Text>
          {completions.filter((row) => row.note?.trim()).length === 0 ? (
            <Text style={styles.sectionHint}>
              Notes you add while logging will collect here.
            </Text>
          ) : (
            completions
              .filter((row) => row.note?.trim())
              .map((completion) => (
                <AchievementNote
                  key={completion.id}
                  habitId={completion.habit_id as BadgeId}
                  note={completion.note}
                  author={
                    completion.user_id === user?.id
                      ? 'You'
                      : (partner?.display_name ?? 'Partner')
                  }
                  date={formatDisplayDate(habitLocalDate(completion.created_at))}
                />
              ))
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

function AchievementNote({
  habitId,
  note,
  author,
  date,
}: {
  habitId: BadgeId
  note: string | null
  author: string
  date?: string
}) {
  const badge = BADGE_BY_ID[habitId]
  const body = note?.trim()
  return (
    <View style={styles.noteCard}>
      <View style={styles.noteCardHead}>
        <Icon name={badge.icon} size={16} color={colors.ink} />
        <Text style={styles.noteMeta}>
          {badge.label} · {author}
          {date ? ` · ${date}` : ''}
        </Text>
      </View>
      {body ? (
        <Text style={styles.noteBody}>{body}</Text>
      ) : (
        <Text style={styles.noteEmpty}>Logged without a note.</Text>
      )}
    </View>
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
  fieldLabel: {
    ...type.label,
    marginBottom: 6,
  },
  note: {
    minHeight: 96,
    textAlignVertical: 'top',
    marginBottom: 8,
    borderRadius: radii.md,
  },
  noteCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
  },
  noteCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noteMeta: {
    ...type.label,
    marginBottom: 0,
    flex: 1,
  },
  noteBody: {
    ...type.body,
  },
  noteEmpty: {
    ...type.body,
    color: colors.muted,
  },
})
