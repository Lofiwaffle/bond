import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'

const REMINDER_ID_KEY = 'bond.checkin.reminderId'
/** Local hour (24h) to remind if today's check-in is missing */
export const CHECK_IN_REMINDER_HOUR = 20
export const CHECK_IN_REMINDER_MINUTE = 0

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false
  }

  if (!Device.isDevice) {
    // Simulators often can't deliver push; local notifications may still work on iOS sim
    console.warn('Notifications work best on a physical device')
  }

  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true

  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
}

/**
 * Schedule a daily local reminder at CHECK_IN_REMINDER_HOUR.
 * Call after confirming the user has not completed today's check-in.
 * Cancels when today's check-in exists.
 */
export async function syncCheckInReminder(
  hasCompletedToday: boolean,
): Promise<void> {
  if (Platform.OS === 'web') return

  const allowed = await ensurePermissions()
  if (!allowed) return

  const existingId = await AsyncStorage.getItem(REMINDER_ID_KEY)
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId)
    await AsyncStorage.removeItem(REMINDER_ID_KEY)
  }

  if (hasCompletedToday) return

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Bond check-in',
      body: 'How connected did you feel today? Take a moment to check in.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: CHECK_IN_REMINDER_HOUR,
      minute: CHECK_IN_REMINDER_MINUTE,
    },
  })

  await AsyncStorage.setItem(REMINDER_ID_KEY, id)
}
