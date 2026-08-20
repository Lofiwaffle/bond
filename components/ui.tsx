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
import { FaceIcon, Icon, type IconName } from '../lib/icons'
import {
  SCORE_HINTS,
  SCORE_LABELS,
  colors,
  hairlineWidth,
  radii,
  type,
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

export function TextLink({
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
      hitSlop={8}
      style={({ pressed }) => [
        styles.textLink,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.textLinkPressed,
      ]}
    >
      <Text style={styles.textLinkLabel}>{label}</Text>
    </Pressable>
  )
}

/** Low-emphasis text action. Kept as an alias so existing screens stay in sync. */
export function SecondaryButton(props: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return <TextLink {...props} />
}

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  color = colors.muted,
}: {
  name: IconName
  onPress: () => void
  accessibilityLabel: string
  color?: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
    >
      <Icon name={name} size={18} color={color} />
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
      <ActivityIndicator size="large" color={colors.muted} />
    </View>
  )
}

export function Divider() {
  return <View style={styles.divider} />
}

export function Section({
  children,
  last = false,
  style,
}: {
  children: ReactNode
  last?: boolean
  style?: ViewStyle
}) {
  return (
    <View style={[styles.section, !last && styles.sectionRule, style]}>
      {children}
    </View>
  )
}

/** Flattened section wrapper. No filled surface, no shadow. */
export function Card({
  children,
  style,
}: {
  children: ReactNode
  style?: ViewStyle
}) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number
  max: number
  label?: string
}) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
      </View>
      {label ? <Text style={styles.progressLabel}>{label}</Text> : null}
    </View>
  )
}

export function ScoreMark({
  score,
  size = 28,
  color = colors.ink,
}: {
  score: number
  size?: number
  color?: string
}) {
  return <FaceIcon score={score} size={size} color={color} />
}

export function ScoreEmoji({
  score,
  size = 28,
}: {
  score: number
  size?: number
}) {
  return <ScoreMark score={score} size={size} />
}

export function ScoreScale({
  value,
  onChange,
}: {
  value: number | null
  onChange: (score: number) => void
}) {
  return (
    <View>
      <View style={styles.scaleRow}>
        {[1, 2, 3, 4, 5].map((score) => {
          const selected = value === score
          return (
            <Pressable
              key={score}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${score}, ${SCORE_LABELS[score]}`}
              onPress={() => onChange(score)}
              style={({ pressed }) => [
                styles.scaleCell,
                selected && styles.scaleCellSelected,
                pressed && styles.scaleCellPressed,
              ]}
            >
              <FaceIcon score={score} size={52} />
            </Pressable>
          )
        })}
      </View>
      <View style={styles.scaleCaptions}>
        <Text style={styles.label}>{SCORE_LABELS[1]}</Text>
        <Text style={styles.label}>{SCORE_LABELS[5]}</Text>
      </View>
      {value != null ? (
        <Text style={styles.scaleHint}>
          {SCORE_LABELS[value]} · {SCORE_HINTS[value]}
        </Text>
      ) : null}
    </View>
  )
}

export function ScoreFacePicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (score: number) => void
  size?: 'large' | 'compact'
}) {
  return <ScoreScale value={value} onChange={onChange} />
}

export function ActivityChips({
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
    <View style={styles.chipWrap}>
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
              styles.chip,
              selected && styles.chipSelected,
              blocked && styles.chipBlocked,
            ]}
          >
            <Icon
              name={activity.icon}
              size={14}
              color={selected ? colors.onAccent : colors.ink}
            />
            <Text
              style={[styles.chipLabel, selected && styles.chipLabelSelected]}
            >
              {activity.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function ActivityIconGrid(props: {
  value: ActivityId[]
  onChange: (next: ActivityId[]) => void
  max?: number
}) {
  return <ActivityChips {...props} />
}

export function ReadOnlyChips({ ids }: { ids: string[] }) {
  if (!ids.length) return null
  return (
    <View style={styles.chipWrap}>
      {ids.map((id) => {
        const activity = ACTIVITIES.find((item) => item.id === id)
        if (!activity) return null
        return (
          <View key={id} style={styles.chip}>
            <Icon name={activity.icon} size={14} color={colors.ink} />
            <Text style={styles.chipLabel}>{activity.label}</Text>
          </View>
        )
      })}
    </View>
  )
}

export function StreakChip({ streak }: { streak: number }) {
  return (
    <Text style={styles.streakLabel}>
      {streak} day streak
    </Text>
  )
}

const HABIT_EMPTY = '#EDE6E8'
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
              const fill = future
                ? 'transparent'
                : !badge
                  ? HABIT_EMPTY
                  : summary.total === 1
                    ? colors.hairline
                    : colors.ink

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
                      borderColor: date === today ? colors.accent : 'transparent',
                      borderWidth: date === today && !future ? 1.5 : 0,
                      opacity: future ? 0 : 1,
                    },
                  ]}
                />
              )
            })}
          </View>
        ))}
      </ScrollView>

      <Text style={styles.label}>Key</Text>
      <View style={styles.habitCalKey}>
        {progress.map((badge) => (
          <Pressable
            key={badge.id}
            accessibilityRole={onPressHabit ? 'button' : undefined}
            accessibilityLabel={`${badge.label}, ${badge.count} logged. Tap to log.`}
            disabled={!onPressHabit}
            onPress={() => onPressHabit?.(badge.id)}
            style={styles.habitCalKeyItem}
          >
            <Icon name={badge.icon} size={16} color={colors.ink} />
            <View style={styles.habitCalKeyCopy}>
              <Text style={styles.body} numberOfLines={1}>
                {badge.label}
              </Text>
              <Text style={styles.label}>
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
    <View style={styles.chipWrap}>
      {badges.map((badge) => (
        <Pressable
          key={badge.id}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={`${badge.label}${badge.count > 0 ? `, logged ${badge.count} times` : ', not logged yet'}`}
          disabled={!onPress}
          onPress={() => onPress?.(badge.id)}
          style={[styles.chip, badge.earned && styles.chipSelected]}
        >
          <Icon
            name={badge.icon}
            size={14}
            color={badge.earned ? colors.onAccent : colors.ink}
          />
          <Text
            style={[
              styles.chipLabel,
              badge.earned && styles.chipLabelSelected,
            ]}
          >
            {badge.label}
          </Text>
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
    ...type.heading,
    marginBottom: 4,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginBottom: 20,
  },
  label: {
    ...type.label,
    marginBottom: 8,
  },
  body: {
    ...type.body,
  },
  input: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
    color: colors.ink,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 15,
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
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  textLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  textLinkPressed: {
    opacity: 0.6,
  },
  textLinkLabel: {
    ...type.body,
    color: colors.muted,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: colors.danger,
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  divider: {
    height: hairlineWidth,
    backgroundColor: colors.hairline,
  },
  section: {
    paddingVertical: 20,
  },
  sectionRule: {
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  card: {
    paddingVertical: 20,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.ink,
    borderRadius: radii.pill,
  },
  progressLabel: {
    ...type.label,
    marginBottom: 0,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scaleCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scaleCellSelected: {
    borderColor: colors.accent,
  },
  scaleCellPressed: {
    opacity: 0.75,
  },
  scaleCaptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  scaleHint: {
    ...type.label,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 0,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipBlocked: {
    opacity: 0.35,
  },
  chipLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    color: colors.ink,
  },
  chipLabelSelected: {
    color: colors.onAccent,
  },
  streakLabel: {
    ...type.label,
    marginBottom: 0,
  },
  habitCal: {
    gap: 12,
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
    borderRadius: 4,
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
    paddingVertical: 8,
    minWidth: '45%',
    flexGrow: 1,
  },
  habitCalKeyCopy: {
    flex: 1,
  },
})
