import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

import { reportError } from './monitor'
import { supabase } from './supabase'

const ENABLED_KEY = 'bond.notifications.enabled'
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

export async function areNotificationsEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ENABLED_KEY)
  return value === 'true'
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!Device.isDevice) return false

    const current = await Notifications.getPermissionsAsync()
    if (current.granted) return true
    const requested = await Notifications.requestPermissionsAsync()
    return requested.granted
  } catch (error) {
    reportError('notifications', error, { platform: Platform.OS })
    return false
  }
}

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('bond-reminders', {
    name: 'Check-in reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  })
  await Notifications.setNotificationChannelAsync('partner-activity', {
    name: 'Partner activity',
    importance: Notifications.AndroidImportance.DEFAULT,
  })
}

export async function enableNotifications(
  userId?: string | null,
): Promise<boolean> {
  const granted = await requestNotificationPermission()
  await AsyncStorage.setItem(ENABLED_KEY, granted ? 'true' : 'false')
  if (!granted) return false
  await ensureAndroidChannels()
  if (userId) await registerPushToken(userId)
  return true
}

export async function disableNotifications(): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, 'false')
  const existingId = await AsyncStorage.getItem(REMINDER_ID_KEY)
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId)
    await AsyncStorage.removeItem(REMINDER_ID_KEY)
  }
}

export async function registerPushToken(userId: string): Promise<void> {
  try {
    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {},
    )
    if (!result.data) return
    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: result.data })
      .eq('id', userId)
    if (error) reportError('notifications', error.message, { op: 'token' })
  } catch (error) {
    reportError('notifications', error, { op: 'token' })
  }
}

export async function showLocalNotification(
  title: string,
  body: string,
  channelId = 'partner-activity',
): Promise<void> {
  const enabled = await areNotificationsEnabled()
  if (!enabled) return

  try {
    const allowed = await requestNotificationPermission()
    if (!allowed) return
    await ensureAndroidChannels()
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null,
    })
  } catch (error) {
    reportError('notifications', error, { op: 'local' })
  }
}

export async function syncCheckInReminder(
  hasCompletedToday: boolean,
): Promise<void> {
  try {
    const enabled = await areNotificationsEnabled()
    const existingId = await AsyncStorage.getItem(REMINDER_ID_KEY)
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId)
      await AsyncStorage.removeItem(REMINDER_ID_KEY)
    }

    if (!enabled || hasCompletedToday) return

    const allowed = await requestNotificationPermission()
    if (!allowed) return
    await ensureAndroidChannels()

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bond check-in',
        body: 'How connected did you feel today? Take a moment to check in.',
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'bond-reminders' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: CHECK_IN_REMINDER_HOUR,
        minute: CHECK_IN_REMINDER_MINUTE,
      },
    })

    await AsyncStorage.setItem(REMINDER_ID_KEY, id)
  } catch (error) {
    reportError('notifications', error, { op: 'reminder' })
  }
}
