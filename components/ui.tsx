import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'

import { ACTIVITIES, type ActivityId } from '../lib/activities'
import { badgesForProgress, type BadgeProgress } from '../lib/badges'
import {
  SCORE_LABELS,
  colors,
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
        <ActivityIndicator color={colors.black} />
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
                borderRadius: radii.md,
                backgroundColor: selected
                  ? scoreColors[score]
                  : scoreColorsSoft[score],
                borderColor: selected ? colors.accent : colors.hairline,
                borderWidth: selected ? 2 : 1,
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
              selected && styles.activityCellSelected,
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

export function BadgeRow({ progress }: { progress: BadgeProgress }) {
  const badges = badgesForProgress(progress)
  return (
    <View style={styles.badgeRow}>
      {badges.map((badge) => (
        <View
          key={badge.id}
          style={[styles.badgeCell, badge.earned && styles.badgeCellEarned]}
        >
          <Text
            style={[styles.badgeGlyph, !badge.earned && styles.badgeMuted]}
          >
            {badge.glyph}
          </Text>
          <Text
            style={[styles.badgeLabel, !badge.earned && styles.badgeMuted]}
          >
            {badge.label}
          </Text>
        </View>
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
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    marginBottom: 22,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.bgSoft,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
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
    color: colors.black,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  secondaryPressed: {
    borderColor: colors.accent,
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
    padding: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: 14,
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
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSoft,
    padding: 6,
  },
  activityCellSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
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
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.bgSoft,
  },
  badgeCellEarned: {
    borderColor: colors.accent,
  },
  badgeGlyph: {
    fontSize: 20,
    color: colors.accent,
    marginBottom: 4,
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
})
