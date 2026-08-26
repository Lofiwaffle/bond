import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import { LoadingScreen, Screen } from '../../../components/ui'
import { useCheckInHistory, computeStreak } from '../../../hooks/useCheckIn'
import { useCoupleGoal } from '../../../hooks/useCoupleGoal'
import { useHabitBadges } from '../../../hooks/useHabitBadges'
import { useWeeklyReview, useWeeklyReviewHistory } from '../../../hooks/useWeeklyReview'
import { useAuth } from '../../../lib/auth'
import { badgesForProgress } from '../../../lib/badges'
import { formatDisplayDate, localDateString } from '../../../lib/dates'
import { Icon, type IconName } from '../../../lib/icons'
import { colors, hairlineWidth, radii, type } from '../../../lib/theme'

export type BondSection = 'achievements' | 'goals' | 'streaks' | 'reviews'

const HUB_OPTIONS: Array<{
  id: BondSection
  icon: IconName
  title: string
  body: string
}> = [
  {
    id: 'achievements',
    icon: 'calendar',
    title: 'Achievements',
    body: 'Calendar and notes for Spark through Sync',
  },
  {
    id: 'goals',
    icon: 'target',
    title: 'Goals',
    body: 'SMART goals you set, review, and put on the calendar',
  },
  {
    id: 'streaks',
    icon: 'trending-up',
    title: 'Streaks',
    body: 'Daily streak, month rhythm, connection mix',
  },
  {
    id: 'reviews',
    icon: 'book-open',
    title: 'Reviews',
    body: 'Summaries of weekly reviews you finish together',
  },
]

function useHubStatus(): Partial<Record<BondSection, string>> {
  const { counts: habitCounts, isLoading: habitsLoading } = useHabitBadges()
  const { activeGoals, isLoading: goalsLoading } = useCoupleGoal()
  const { days, isLoading: checkInLoading } = useCheckInHistory()
  const { needsReview } = useWeeklyReview()
  const { weeks, isLoading: reviewsLoading } = useWeeklyReviewHistory()

  const status: Partial<Record<BondSection, string>> = {}

  if (!habitsLoading) {
    const earned = badgesForProgress({ completions: habitCounts }).filter(
      (b) => b.earned,
    ).length
    status.achievements = `${earned}/5 unlocked`
  }

  if (!goalsLoading) {
    status.goals =
      activeGoals.length === 0
        ? 'No active goals yet'
        : activeGoals[0].deadline
          ? `${activeGoals.length} active · next due ${formatDisplayDate(activeGoals[0].deadline)}`
          : `${activeGoals.length} active`
  }

  if (!checkInLoading) {
    const streak = computeStreak(
      days.filter((d) => d.mine).map((d) => d.date),
      localDateString(),
    )
    status.streaks = streak > 0 ? `${streak}-day streak` : 'No streak yet'
  }

  if (!reviewsLoading) {
    const lastCompleted = weeks
      .filter((w) => w.completed)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0]
    status.reviews = needsReview
      ? 'This week’s review is ready'
      : lastCompleted
        ? `Last reviewed ${formatDisplayDate(lastCompleted.weekEnd)}`
        : 'None finished yet'
  }

  return status
}

export default function BondHubScreen() {
  const { profile, isLoading } = useAuth()
  const status = useHubStatus()

  if (isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  const openSection = (section: BondSection) => {
    router.push(`/(app)/bond/${section}`)
  }

  return (
    <Screen>
      <Text style={styles.title}>Bond</Text>
      <Text style={styles.subtitle}>How are we growing together?</Text>

      <View>
        {HUB_OPTIONS.map((option, index) => {
          const body = status[option.id] ?? option.body
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={`${option.title}. ${body}`}
              onPress={() => openSection(option.id)}
              style={(state) => [
                styles.row,
                index === HUB_OPTIONS.length - 1 && styles.rowLast,
                state.pressed && styles.rowPressed,
                Boolean((state as { focused?: boolean }).focused) &&
                  styles.rowFocus,
              ]}
            >
              <View style={styles.iconBadge}>
                <Icon name={option.icon} size={18} color={colors.accent} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>{option.title}</Text>
                <Text style={styles.rowBody}>{body}</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </Pressable>
          )
        })}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    ...type.heading,
    marginBottom: 4,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 16,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowFocus: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  rowTitle: {
    ...type.body,
    fontWeight: '500',
  },
  rowBody: {
    ...type.label,
    marginTop: 2,
    marginBottom: 0,
  },
})
