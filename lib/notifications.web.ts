import AsyncStorage from '@react-native-async-storage/async-storage'

import { reportError } from './monitor'

const ENABLED_KEY = 'bond.notifications.enabled'
const WEB_REMINDER_DATE_KEY = 'bond.checkin.webReminderDate'

export const CHECK_IN_REMINDER_HOUR = 20
export const CHECK_IN_REMINDER_MINUTE = 0

type WebNotificationApi = {
  permission: NotificationPermission
  requestPermission: () => Promise<NotificationPermission>
  new (title: string, options?: NotificationOptions): Notification
}

function webNotificationApi(): WebNotificationApi | null {
  if (typeof window === 'undefined') return null
  const ctor = (window as unknown as { Notification?: WebNotificationApi })
    .Notification
  return ctor ?? null
}

export async function areNotificationsEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ENABLED_KEY)
  return value === 'true'
}

export async function requestNotificationPermission(): Promise<boolean> {
  const NotificationApi = webNotificationApi()
  if (!NotificationApi) return false
  if (NotificationApi.permission === 'granted') return true
  if (NotificationApi.permission === 'denied') return false
  try {
    const result = await NotificationApi.requestPermission()
    return result === 'granted'
  } catch (error) {
    reportError('notifications', error, { platform: 'web' })
    return false
  }
}

export async function enableNotifications(
  _userId?: string | null,
): Promise<boolean> {
  const granted = await requestNotificationPermission()
  await AsyncStorage.setItem(ENABLED_KEY, granted ? 'true' : 'false')
  return granted
}

export async function disableNotifications(): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, 'false')
  clearWebReminder()
}

export async function registerPushToken(_userId: string): Promise<void> {
  // Expo push tokens are not supported in the web install.
}

export async function showLocalNotification(
  title: string,
  body: string,
  _channelId = 'partner-activity',
): Promise<void> {
  const enabled = await areNotificationsEnabled()
  if (!enabled) return

  try {
    const granted = await requestNotificationPermission()
    if (!granted) return
    const payload = { type: 'notify', title, body }
    const worker =
      typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined
    if (worker?.controller) {
      worker.controller.postMessage(payload)
      return
    }
    const NotificationApi = webNotificationApi()
    if (NotificationApi && NotificationApi.permission === 'granted') {
      new NotificationApi(title, { body })
    }
  } catch (error) {
    reportError('notifications', error, { platform: 'web' })
  }
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

export async function syncCheckInReminder(
  hasCompletedToday: boolean,
): Promise<void> {
  const enabled = await areNotificationsEnabled()
  clearWebReminder()
  if (!enabled || hasCompletedToday) return
  const granted = await requestNotificationPermission()
  if (!granted) return
  webReminderTimer = setTimeout(() => {
    void (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10)
        const shown = await AsyncStorage.getItem(WEB_REMINDER_DATE_KEY)
        if (shown === today) return
        await AsyncStorage.setItem(WEB_REMINDER_DATE_KEY, today)
        await showLocalNotification(
          'Bond check-in',
          'How connected did you feel today? Take a moment to check in.',
          'bond-reminders',
        )
      } catch (error) {
        reportError('notifications', error, { platform: 'web' })
      }
    })()
  }, msUntilDailyReminder())
}
