import type { ReactNode } from 'react'
import { forwardRef, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
import { useAccessibleLayout } from '../lib/a11y'
import { calendarCellSize } from '../lib/a11yLayout'
import {
  SCORE_LABELS,
  colors,
  hairlineWidth,
  hit,
  phoneMaxWidth,
  radii,
  type,
} from '../lib/theme'

function isFocused(state: { pressed: boolean }): boolean {
  return Boolean((state as { pressed: boolean; focused?: boolean }).focused)
}

export function Screen({
  children,
  style,
  keyboard = false,
}: {
  children: ReactNode
  style?: ViewStyle
  keyboard?: boolean
}) {
  const insets = useSafeAreaInsets()
  const inner = (
    <View
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, 12) + 12,
          paddingBottom: Math.max(insets.bottom, 16),
        },
        style,
      ]}
    >
      {children}
    </View>
  )
  if (!keyboard) return inner
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      {inner}
    </KeyboardAvoidingView>
  )
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

export const Field = forwardRef<TextInput, TextInputProps>(function Field(
  props,
  ref,
) {
  const [focused, setFocused] = useState(false)
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.muted}
      autoCapitalize="none"
      autoCorrect={false}
      accessibilityLabel={props.accessibilityLabel ?? props.placeholder}
      {...props}
      onFocus={(event) => {
        setFocused(true)
        props.onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocused(false)
        props.onBlur?.(event)
      }}
      style={[styles.input, focused && styles.inputFocus, props.style]}
    />
  )
})

export function ErrorText({
  message,
  nativeID,
}: {
  message: string | null
  nativeID?: string
}) {
  if (!message) return null
  return (
    <Text
      nativeID={nativeID}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={styles.error}
    >
      {message}
    </Text>
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
  const busy = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy: Boolean(loading) }}
      onPress={() => {
        if (busy) return
        onPress()
      }}
      disabled={busy}
      style={(state) => [
        styles.button,
        busy && styles.buttonDisabled,
        state.pressed && !busy && styles.buttonPressed,
        isFocused(state) && styles.focusRing,
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
      style={(state) => [
        styles.textLink,
        disabled && styles.buttonDisabled,
        state.pressed && !disabled && styles.textLinkPressed,
        isFocused(state) && styles.focusRing,
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
      hitSlop={8}
      style={(state) => [
        styles.iconButton,
        state.pressed && { opacity: 0.6 },
        isFocused(state) && styles.focusRing,
      ]}
    >
      <Icon name={name} size={18} color={color} />
    </Pressable>
  )
}

export function LoadingScreen({ label = 'Loading Bond' }: { label?: string }) {
  return (
    <View
      style={styles.loading}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator size="large" color={colors.muted} />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  )
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View style={styles.empty} accessibilityRole="summary">
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  )
}

export function StatusPanel({
  message,
  onRetry,
  retryLabel = 'Try again',
}: {
  message: string
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.status}
    >
      <Text style={styles.statusText}>{message}</Text>
      {onRetry ? (
        <PrimaryButton label={retryLabel} onPress={onRetry} />
      ) : null}
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
  const { width, fontScale, highContrast } = useAccessibleLayout()
  const face = Math.round((width < 360 ? 40 : 52) * Math.min(fontScale, 1.35))
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
              accessibilityLabel={SCORE_LABELS[score]}
              onPress={() => onChange(score)}
              style={(state) => [
                styles.scaleCell,
                selected && styles.scaleCellSelected,
                highContrast && styles.scaleCellContrast,
                selected && highContrast && styles.scaleCellSelectedContrast,
                state.pressed && styles.scaleCellPressed,
                isFocused(state) && styles.focusRing,
              ]}
            >
              <FaceIcon score={score} size={face} />
            </Pressable>
          )
        })}
      </View>
      <View style={styles.scaleCaptions}>
        <Text style={styles.label}>{SCORE_LABELS[1]}</Text>
        <Text style={styles.label}>{SCORE_LABELS[5]}</Text>
      </View>
      {value != null ? (
        <Text style={styles.scaleHint}>{SCORE_LABELS[value]}</Text>
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
            style={(state) => [
              styles.chip,
              selected && styles.chipSelected,
              blocked && styles.chipBlocked,
              state.pressed && !blocked && { opacity: 0.8 },
              isFocused(state) && styles.focusRing,
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
      {streak} day{streak === 1 ? '' : 's'} connected
    </Text>
  )
}

const ACHIEVEMENT_EMPTY = '#EDE6E8'
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const CAL_GAP = 5
const WEEKDAY_COL = 16

export function AchievementCalendar({
  completions,
  onPressAchievement,
  onPressDate,
  selectedDate,
  weekCount = 12,
}: {
  completions: Array<{ habit_id: string; created_at: string; note?: string | null }>
  onPressAchievement?: (id: BadgeId) => void
  onPressDate?: (date: string) => void
  selectedDate?: string | null
  weekCount?: number
}) {
  const { width } = useWindowDimensions()
  const frameWidth = Math.min(width, phoneMaxWidth)
  const weeks = useMemo(() => habitCalendarWeeks(weekCount), [weekCount])
  const dayCounts = useMemo(() => habitDayCounts(completions), [completions])
  const noteDates = useMemo(() => {
    const dates = new Set<string>()
    for (const row of completions) {
      if (row.note?.trim()) dates.add(habitLocalDateFromIso(row.created_at))
    }
    return dates
  }, [completions])
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

  const { fontScale } = useAccessibleLayout()
  const available = Math.max(220, frameWidth - 40 - WEEKDAY_COL - 8)
  const cell = calendarCellSize(available, weekCount, fontScale, CAL_GAP)

  return (
    <View style={styles.habitCal}>
      <View style={styles.habitCalRow}>
        <View style={[styles.habitCalWeekdays, { gap: CAL_GAP }]}>
          {WEEKDAY_LABELS.map((label, i) => (
            <Text
              key={`${label}-${i}`}
              style={[styles.habitCalWeekday, { height: cell, lineHeight: cell }]}
            >
              {label}
            </Text>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.habitCalGrid, { gap: CAL_GAP }]}
        >
          {weeks.map((week, wi) => (
            <View key={wi} style={[styles.habitCalWeek, { gap: CAL_GAP }]}>
              {week.map((date) => {
                const summary = habitCombinedDaySummary(dayCounts, date)
                const future = date > today
                const badge = summary.primary
                  ? badgeById[summary.primary]
                  : null
                const selected = date === selectedDate
                const fill = future
                  ? 'transparent'
                  : !badge
                    ? ACHIEVEMENT_EMPTY
                    : summary.total === 1
                      ? (badge.colorSoft ?? colors.hairline)
                      : (badge.color ?? colors.ink)

                return (
                  <Pressable
                    key={date}
                    disabled={future || !onPressDate}
                    accessibilityRole={onPressDate && !future ? 'button' : undefined}
                    accessibilityLabel={
                      future
                        ? undefined
                        : summary.total === 0
                          ? `${date}: no achievements`
                          : `${date}: ${summary.habits.join(', ')}`
                    }
                    onPress={() => onPressDate?.(date)}
                    hitSlop={Math.max(0, Math.ceil((hit - cell) / 2))}
                    style={[
                      styles.habitCalCell,
                      {
                        width: cell,
                        height: cell,
                        borderRadius: Math.max(6, Math.round(cell / 4)),
                        backgroundColor: fill,
                        borderColor: selected
                          ? colors.accent
                          : date === today
                            ? colors.accent
                            : 'transparent',
                        borderWidth: selected || date === today ? 2 : 0,
                        opacity: future ? 0 : 1,
                      },
                    ]}
                  >
                    {noteDates.has(date) ? (
                      <View
                        style={[
                          styles.habitCalNoteDot,
                          summary.total > 1 && styles.habitCalNoteDotOnDark,
                        ]}
                      />
                    ) : null}
                  </Pressable>
                )
              })}
            </View>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.label}>Key</Text>
      <View style={styles.habitCalKey}>
        {progress.map((badge) => (
          <Pressable
            key={badge.id}
            accessibilityRole={onPressAchievement ? 'button' : undefined}
            accessibilityLabel={`${badge.label}, ${badge.count} logged. Tap to log.`}
            disabled={!onPressAchievement}
            onPress={() => onPressAchievement?.(badge.id)}
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

function habitLocalDateFromIso(iso: string): string {
  const d = new Date(iso)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** @deprecated Use AchievementCalendar */
export const HabitCalendar = AchievementCalendar

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
  flex: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
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
    minHeight: hit,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    color: colors.ink,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocus: Platform.select<TextStyle>({
    web: {
      outlineWidth: 2,
      outlineColor: colors.ink,
      outlineStyle: 'solid',
      outlineOffset: 2,
    },
    default: {
      borderColor: colors.ink,
    },
  }),
  button: {
    backgroundColor: colors.accentFill,
    borderRadius: radii.pill,
    minHeight: hit,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    lineHeight: 22,
    fontWeight: '500',
  },
  textLink: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: hit,
    paddingVertical: 12,
  },
  textLinkPressed: {
    opacity: 0.6,
  },
  textLinkLabel: {
    ...type.body,
    color: colors.muted,
  },
  iconButton: {
    width: hit,
    height: hit,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusRing: Platform.select({
    web: {
      outlineWidth: 2,
      outlineColor: colors.ink,
      outlineStyle: 'solid',
      outlineOffset: 2,
    },
    default: {},
  }) as ViewStyle,
  error: {
    color: colors.danger,
    marginBottom: 8,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: 12,
  },
  loadingLabel: {
    ...type.label,
    marginBottom: 0,
  },
  empty: {
    paddingVertical: 28,
    paddingHorizontal: 8,
  },
  emptyTitle: {
    ...type.heading,
    marginBottom: 8,
  },
  emptyBody: {
    ...type.body,
    color: colors.muted,
    marginBottom: 16,
  },
  status: {
    paddingVertical: 12,
    gap: 8,
  },
  statusText: {
    ...type.body,
    color: colors.danger,
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
    minWidth: hit,
    minHeight: hit,
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
  scaleCellContrast: {
    borderColor: colors.ink,
  },
  scaleCellSelectedContrast: {
    borderColor: colors.ink,
    backgroundColor: colors.accentSoft,
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
    minHeight: hit,
    gap: 6,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.accentFill,
    borderColor: colors.accentFill,
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
  habitCalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  habitCalWeekdays: {
    width: WEEKDAY_COL,
    paddingTop: 2,
  },
  habitCalWeekday: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
  },
  habitCalGrid: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  habitCalWeek: {},
  habitCalCell: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 3,
  },
  habitCalNoteDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  habitCalNoteDotOnDark: {
    backgroundColor: colors.white,
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
