import { Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, radii, type } from '../lib/theme'
import { PrimaryButton } from './ui'

export function NextStepCard({
  kicker,
  title,
  body,
  actionLabel,
  onAction,
}: {
  kicker: string
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}) {
  const inner = (
    <View>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  )

  if (onAction && !actionLabel) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${kicker}. ${title}`}
        onPress={onAction}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {inner}
      </Pressable>
    )
  }

  return <View style={styles.card}>{inner}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  kicker: {
    ...type.label,
    color: colors.accentFill,
    marginBottom: 4,
  },
  title: {
    ...type.body,
    fontWeight: '500',
  },
  body: {
    ...type.label,
    marginTop: 4,
    marginBottom: 0,
  },
  action: {
    marginTop: 16,
  },
})
