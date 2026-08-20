import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'

import { ACTIVITIES, type ActivityId } from '../lib/activities'
import {
  BADGES,
  badgesForProgress,
  habitCalendarWeeks,
  habitCombinedDaySummary,
  habitDayCounts,
  type BadgeId,
  type BadgeProgress,
} from '../lib/badges'
import { localDateString } from '../lib/dates'
import {
  SCORE_LABELS,
  colors,
  elevation,
  radii,
  scoreColors,
  scoreColorsSoft,
  scoreEmojis,
} from '../lib/theme'

export function Screen({
  children,
  style,
}: {
  children: ReactNode
  style?: ViewStyle
}) {
  return <View style={[styles.screen, style]}>{children}</View>
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>
}

export function Subtitle({ children }: { children: ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>
}

export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={[styles.input, props.style]}
    />
  )
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Text style={styles.buttonLabel}>{label}</Text>
      )}
    </Pressable>
  )
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondaryButton,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.secondaryPressed,
      ]}
    >
      <Text style={styles.secondaryLabel}>{label}</Text>
    </Pressable>
  )
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null
  return <Text style={styles.error}>{message}</Text>
}

export function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  )
}

export function Card({
  children,
  style,
}: {
  children: ReactNode
  style?: ViewStyle
}) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function ScoreEmoji({
  score,
  size = 40,
}: {
  score: number
  size?: number
}) {
  return (
    <Text style={{ fontSize: size, lineHeight: size + 4 }}>
      {scoreEmojis[score] ?? '😐'}
    </Text>
  )
}

export function ScoreFacePicker({
  value,
  onChange,
  size = 'large',
}: {
  value: number | null
  onChange: (score: number) => void
  size?: 'large' | 'compact'
}) {
  const faceSize = size === 'large' ? 44 : 30
  const circle = size === 'large' ? 64 : 48

  return (
    <View style={styles.faceRow}>
      {[1, 2, 3, 4, 5].map((score) => {
        const selected = value === score
        return (
          <Pressable
            key={score}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${score}, ${SCORE_LABELS[score]}`}
            onPress={() => onChange(score)}
            style={[
              styles.faceButton,
              {
                width: circle,
                height: circle,
                borderRadius: radii.pill,
                backgroundColor: selected
                  ? scoreColors[score]
                  : scoreColorsSoft[score],
                borderColor: selected ? colors.white : 'transparent',
                borderWidth: selected ? 3 : 0,
                transform: [{ scale: selected ? 1.06 : 1 }],
              },
            ]}
          >
            <Text style={{ fontSize: faceSize }}>{scoreEmojis[score]}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function ActivityIconGrid({
  value,
  onChange,
  max = 5,
}: {
  value: ActivityId[]
  onChange: (next: ActivityId[]) => void
  max?: number
}) {
  const toggle = (id: ActivityId) => {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id))
      return
    }
    if (value.length >= max) return
    onChange([...value, id])
  }

  return (
    <View style={styles.activityGrid}>
      {ACTIVITIES.map((activity) => {
        const selected = value.includes(activity.id)
        const blocked = !selected && value.length >= max
        return (
          <Pressable
            key={activity.id}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: blocked }}
            accessibilityLabel={activity.label}
            disabled={blocked}
            onPress={() => toggle(activity.id)}
            style={[
              styles.activityCell,
              selected && {
                backgroundColor: activity.tint,
                borderColor: colors.accent,
              },
              blocked && styles.activityCellBlocked,
            ]}
          >
            <Text style={styles.activityGlyph}>{activity.glyph}</Text>
            <Text
              style={[
                styles.activityLabel,
                selected && styles.activityLabelSelected,
              ]}
            >
              {activity.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function StreakChip({ streak }: { streak: number }) {
  return (
    <View style={styles.streakChip}>
      <Text style={styles.streakChipValue}>{streak}</Text>
      <Text style={styles.streakChipLabel}>day streak</Text>
    </View>
  )
}

const HABIT_EMPTY = '#F3EBEF'
const HABIT_CELL = 13
const HABIT_GAP = 3

export function HabitCalendar({
  completions,
  onPressHabit,
  weekCount = 16,
}: {
  completions: Array<{ habit_id: string; created_at: string }>
  onPressHabit?: (id: BadgeId) => void
  weekCount?: number
}) {
  const weeks = useMemo(() => habitCalendarWeeks(weekCount), [weekCount])
  const dayCounts = useMemo(() => habitDayCounts(completions), [completions])
  const today = localDateString()
  const badgeById = useMemo(
    () => Object.fromEntries(BADGES.map((b) => [b.id, b])) as Record<
      BadgeId,
      (typeof BADGES)[number]
    >,
    [],
  )
  const progress = useMemo(() => {
    const counts = BADGES.reduce(
      (acc, b) => {
        acc[b.id] = Object.values(dayCounts[b.id]).reduce((a, n) => a + n, 0)
        return acc
      },
      {} as Record<BadgeId, number>,
    )
    return badgesForProgress({ completions: counts })
  }, [dayCounts])

  return (
    <View style={styles.habitCal}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.habitCalGrid}
      >
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.habitCalWeek}>
            {week.map((date) => {
              const summary = habitCombinedDaySummary(dayCounts, date)
              const future = date > today
              const badge = summary.primary
                ? badgeById[summary.primary]
                : null
              const multi = summary.habits.length > 1
              const fill = future
                ? 'transparent'
                : !badge
                  ? HABIT_EMPTY
                  : summary.total === 1
                    ? badge.colorSoft
                    : badge.color
              const border = future
                ? 'transparent'
                : date === today
                  ? colors.accent
                  : multi
                    ? colors.ink
                    : badge
                      ? badge.color
                      : colors.hairline

              return (
                <View
                  key={date}
                  accessibilityLabel={
                    future
                      ? undefined
                      : summary.total === 0
                        ? `${date}: no habits`
                        : `${date}: ${summary.habits.join(', ')}`
                  }
                  style={[
                    styles.habitCalCell,
                    {
                      backgroundColor: fill,
                      borderColor: border,
                      borderWidth: date === today && !future ? 2 : 0,
                      opacity: future ? 0 : 1,
                    },
                  ]}
                />
              )
            })}
          </View>
        ))}
      </ScrollView>

      <Text style={styles.habitCalKeyTitle}>Key</Text>
      <View style={styles.habitCalKey}>
        {progress.map((badge) => (
          <Pressable
            key={badge.id}
            accessibilityRole={onPressHabit ? 'button' : undefined}
            accessibilityLabel={`${badge.label}, ${badge.count} logged. Tap to log.`}
            disabled={!onPressHabit}
            onPress={() => onPressHabit?.(badge.id)}
            style={[
              styles.habitCalKeyItem,
              badge.earned && { borderColor: badge.color },
            ]}
          >
            <View
              style={[styles.habitCalSwatch, { backgroundColor: badge.color }]}
            />
            <View style={styles.habitCalKeyCopy}>
              <Text style={styles.habitCalLabel} numberOfLines={1}>
                {badge.glyph} {badge.label}
              </Text>
              <Text style={styles.habitCalCount}>
                {badge.count > 0 ? `×${badge.count}` : 'tap to log'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

/** @deprecated Prefer HabitCalendar: kept for any leftover callers */
export function BadgeRow({
  progress,
  onPress,
}: {
  progress: BadgeProgress
  onPress?: (id: BadgeId) => void
}) {
  const badges = badgesForProgress(progress)
  return (
    <View style={styles.badgeRow}>
      {badges.map((badge) => (
        <Pressable
          key={badge.id}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={`${badge.label}${badge.count > 0 ? `, logged ${badge.count} times` : ', not logged yet'}`}
          disabled={!onPress}
          onPress={() => onPress?.(badge.id)}
          style={[
            styles.badgeCell,
            badge.earned && { borderColor: badge.color },
          ]}
        >
          <View
            style={[
              styles.badgeSquare,
              {
                backgroundColor: badge.earned ? badge.color : HABIT_EMPTY,
                borderColor: badge.earned ? badge.color : colors.hairline,
              },
            ]}
          />
          <Text
            style={[styles.badgeLabel, !badge.earned && styles.badgeMuted]}
          >
            {badge.glyph} {badge.label}
          </Text>
          {badge.count > 0 ? (
            <Text style={[styles.badgeCount, { color: badge.color }]}>
              ×{badge.count}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 8,
  },
  input: {
    borderWidth: 0,
    backgroundColor: colors.bgSoft,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    backgroundColor: colors.accentPressed,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonLabel: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: radii.pill,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: colors.accentSoft,
    borderWidth: 0,
  },
  secondaryPressed: {
    backgroundColor: '#FFD6E5',
  },
  secondaryLabel: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 18,
    borderWidth: 0,
    marginBottom: 14,
    ...elevation.card,
  },
  faceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  faceButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  activityCell: {
    width: '23%',
    minWidth: 72,
    flexGrow: 1,
    aspectRatio: 1,
    borderWidth: 0,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSoft,
    padding: 6,
  },
  activityCellBlocked: {
    opacity: 0.35,
  },
  activityGlyph: {
    fontSize: 22,
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  activityLabelSelected: {
    color: colors.accent,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    borderWidth: 0,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  streakChipValue: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 16,
  },
  streakChipLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCell: {
    width: '30%',
    flexGrow: 1,
    minWidth: 88,
    borderWidth: 0,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: colors.bgSoft,
  },
  badgeSquare: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 0,
    marginBottom: 6,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  badgeMuted: {
    color: colors.muted,
    opacity: 0.55,
  },
  badgeCount: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 2,
  },
  habitCal: {
    gap: 12,
  },
  habitCalSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  habitCalLabel: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 13,
  },
  habitCalCount: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 11,
    marginTop: 1,
  },
  habitCalGrid: {
    flexDirection: 'row',
    gap: HABIT_GAP,
    paddingVertical: 2,
  },
  habitCalWeek: {
    gap: HABIT_GAP,
  },
  habitCalCell: {
    width: HABIT_CELL,
    height: HABIT_CELL,
    borderRadius: 5,
    borderWidth: 0,
    borderColor: colors.hairline,
  },
  habitCalKeyTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  habitCalKey: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  habitCalKeyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 0,
    borderRadius: radii.md,
    backgroundColor: colors.bgSoft,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: '45%',
    flexGrow: 1,
  },
  habitCalKeyCopy: {
    flex: 1,
  },
})
