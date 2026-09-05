import { StyleSheet, Text, View } from 'react-native'

import { colors, elevation, radii, type } from '../lib/theme'
import { PrimaryButton } from './ui'
import { PressScale } from './PressScale'

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
      <PressScale
        accessibilityLabel={`${kicker}. ${title}`}
        onPress={onAction}
        style={styles.card}
      >
        {inner}
      </PressScale>
    )
  }

  return <View style={styles.card}>{inner}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.card,
  },
  kicker: {
    ...type.label,
    color: colors.accentFill,
    marginBottom: 6,
  },
  title: {
    ...type.heading,
    fontSize: 20,
    lineHeight: 26,
  },
  body: {
    ...type.body,
    color: colors.muted,
    marginTop: 6,
    marginBottom: 0,
  },
  action: {
    marginTop: 16,
  },
})
