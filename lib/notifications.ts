import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

import { supabase } from './supabase'

const ENABLED_KEY = 'bond.notifications.enabled'
const REMINDER_ID_KEY = 'bond.checkin.reminderId'
const WEB_REMINDER_DATE_KEY = 'bond.checkin.webReminderDate'

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

type WebNotificationApi = {
  permission: NotificationPermission
  requestPermission: () => Promise<NotificationPermission>
  new (title: string, options?: NotificationOptions): Notification
}

function webNotificationApi(): WebNotificationApi | null {
  if (typeof window === 'undefined') return null
  const ctor = (window as unknown as { Notification?: WebNotificationApi }).Notification
  return ctor ?? null
}

export async function areNotificationsEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ENABLED_KEY)
  return value === 'true'
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    const NotificationApi = webNotificationApi()
    if (!NotificationApi) return false
    if (NotificationApi.permission === 'granted') return true
    if (NotificationApi.permission === 'denied') return false
    const result = await NotificationApi.requestPermission()
    return result === 'granted'
  }

  if (!Device.isDevice) {
    console.warn('Notifications work best on a physical device')
  }

  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const requested = await Notifications.requestPermissionsAsync()
  return requested.granted
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

export async function enableNotifications(userId?: string | null): Promise<boolean> {
  const granted = await requestNotificationPermission()
  await AsyncStorage.setItem(ENABLED_KEY, granted ? 'true' : 'false')
  if (!granted) return false
  await ensureAndroidChannels()
  if (userId) await registerPushToken(userId)
  return true
}

export async function disableNotifications(): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, 'false')
  clearWebReminder()
  if (Platform.OS === 'web') return
  const existingId = await AsyncStorage.getItem(REMINDER_ID_KEY)
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId)
    await AsyncStorage.removeItem(REMINDER_ID_KEY)
  }
}

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : {},
    )
    if (!result.data) return
    await supabase
      .from('profiles')
      .update({ expo_push_token: result.data })
      .eq('id', userId)
  } catch (error) {
    console.warn('Could not register push token', error)
  }
}

export async function showLocalNotification(
  title: string,
  body: string,
  channelId = 'partner-activity',
): Promise<void> {
  const enabled = await areNotificationsEnabled()
  if (!enabled) return

  if (Platform.OS === 'web') {
    const granted = await requestNotificationPermission()
    if (!granted) return
    const payload = { type: 'notify', title, body }
    const worker = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined
    if (worker?.controller) {
      worker.controller.postMessage(payload)
      return
    }
    const NotificationApi = webNotificationApi()
    if (NotificationApi && NotificationApi.permission === 'granted') {
      new NotificationApi(title, { body })
    }
    return
  }

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
}

let webReminderTimer: ReturnType<typeof setTimeout> | null = null

function clearWebReminder() {
  if (!webReminderTimer) return
  clearTimeout(webReminderTimer)
  webReminderTimer = null
}

function msUntilDailyReminder(): number {
  const now = new Date()
  const fire = new Date()
  fire.setHours(CHECK_IN_REMINDER_HOUR, CHECK_IN_REMINDER_MINUTE, 0, 0)
  if (fire.getTime() <= now.getTime()) {
    fire.setDate(fire.getDate() + 1)
  }
  return fire.getTime() - now.getTime()
}

/**
 * Schedule a daily local reminder at CHECK_IN_REMINDER_HOUR.
 * Cancels when today's check-in exists.
 * On web, fires while the install/tab stays open.
 */
export async function syncCheckInReminder(
  hasCompletedToday: boolean,
): Promise<void> {
  const enabled = await areNotificationsEnabled()

  if (Platform.OS === 'web') {
    clearWebReminder()
    if (!enabled || hasCompletedToday) return
    const granted = await requestNotificationPermission()
    if (!granted) return
    webReminderTimer = setTimeout(() => {
      void (async () => {
        const today = new Date().toISOString().slice(0, 10)
        const shown = await AsyncStorage.getItem(WEB_REMINDER_DATE_KEY)
        if (shown === today) return
        await AsyncStorage.setItem(WEB_REMINDER_DATE_KEY, today)
        await showLocalNotification(
          'Bond check-in',
          'How connected did you feel today? Take a moment to check in.',
          'bond-reminders',
        )
      })()
    }, msUntilDailyReminder())
    return
  }

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
}
