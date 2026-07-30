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
        <ActivityIndicator color={colors.white} />
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
  const faceSize = size === 'large' ? 52 : 36
  const circle = size === 'large' ? 72 : 52

  return (
    <View style={styles.faceRow}>
      {[1, 2, 3, 4, 5].map((score) => {
        const selected = value === score
        return (
          <Pressable
            key={score}
            accessibilityRole="button"
            accessibilityLabel={`${score}, ${SCORE_LABELS[score]}`}
            onPress={() => onChange(score)}
            style={[
              styles.faceButton,
              {
                width: circle,
                height: circle,
                borderRadius: circle / 2,
                backgroundColor: selected
                  ? scoreColors[score]
                  : scoreColorsSoft[score],
                borderColor: selected ? scoreColors[score] : 'transparent',
                borderWidth: selected ? 3 : 0,
                transform: [{ scale: selected ? 1.08 : 1 }],
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.muted,
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
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
    opacity: 0.45,
  },
  buttonLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: colors.accentSoft,
  },
  secondaryPressed: {
    opacity: 0.75,
  },
  secondaryLabel: {
    color: colors.accentPressed,
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
    borderWidth: 1,
    borderColor: colors.border,
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
})
