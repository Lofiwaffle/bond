import { useEffect, type ReactNode } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'

import { colors, phoneMaxWidth, radii, type } from '../lib/theme'
import { useOnline } from '../lib/network'
import { useToast } from '../lib/toast'
import {
  OFFLINE_DRAFT_BANNER,
  OFFLINE_QUEUED_BANNER,
  useQueuedCheckIn,
} from '../lib/checkInOutbox'
import { useAuth } from '../lib/auth'

export const PHONE_MAX_WIDTH = phoneMaxWidth

export function PhoneShell({ children }: { children: ReactNode }) {
  const online = useOnline()
  const { user } = useAuth()
  const queued = useQueuedCheckIn(user?.id)
  const { message, clearToast } = useToast()

  useEffect(() => {
    if (!message) return
    const id = setTimeout(clearToast, 2800)
    return () => clearTimeout(id)
  }, [clearToast, message])

  return (
    <View style={styles.outer} accessibilityRole="none">
      <View style={styles.frame} testID="phone-frame" accessibilityRole="none">
        {!online ? (
          <View
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.offline}
          >
            <Text style={styles.offlineText}>
              {queued ? OFFLINE_QUEUED_BANNER : OFFLINE_DRAFT_BANNER}
            </Text>
          </View>
        ) : null}
        {children}
        {message ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={message}
            onPress={clearToast}
            style={styles.toast}
          >
            <Text style={styles.toastText}>{message}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.frame,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { minHeight: '100%' as unknown as number } : {}),
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: PHONE_MAX_WIDTH,
    backgroundColor: colors.bg,
    overflow: Platform.OS === 'web' ? 'hidden' : 'visible',
  },
  offline: {
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  offlineText: {
    ...type.label,
    color: colors.white,
    marginBottom: 0,
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 28,
    minHeight: 44,
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    zIndex: 20,
  },
  toastText: {
    ...type.body,
    color: colors.white,
    marginBottom: 0,
  },
})
