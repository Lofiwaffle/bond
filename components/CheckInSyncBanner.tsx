import { StyleSheet, Text, View } from 'react-native'

import { checkInSyncMessage } from '../lib/checkInOutbox'
import { colors, radii, type } from '../lib/theme'

export function CheckInSyncBanner({
  queued,
  syncing,
  online,
  allowDraft = true,
}: {
  queued: boolean
  syncing?: boolean
  online: boolean
  allowDraft?: boolean
}) {
  const message = checkInSyncMessage({ queued, syncing, online, allowDraft })
  if (!message) return null

  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={
        message.detail ? `${message.title} ${message.detail}` : message.title
      }
      style={styles.banner}
    >
      <Text style={styles.title}>{message.title}</Text>
      {message.detail ? (
        <Text style={styles.detail}>{message.detail}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  title: {
    ...type.body,
    fontWeight: '500',
    marginBottom: 0,
  },
  detail: {
    ...type.label,
    marginTop: 4,
    marginBottom: 0,
  },
})
