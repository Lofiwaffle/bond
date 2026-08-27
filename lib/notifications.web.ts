import { reportError } from './monitor'
import { LOCK_SCREEN_BODY, LOCK_SCREEN_TITLE } from './notificationCopy'
import {
  type NotificationPrefs,
  nextDailyReminderAt,
  nextSnoozeAt,
} from './notificationSchedule'

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

function pageIsVisible(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'visible'
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

export async function areNotificationsEnabled(): Promise<boolean> {
  const NotificationApi = webNotificationApi()
  return NotificationApi?.permission === 'granted'
}

export async function enableNotifications(
  _userId?: string | null,
): Promise<boolean> {
  return requestNotificationPermission()
}

export async function registerPushToken(_userId: string): Promise<void> {
  // Expo push tokens are not supported in the web install.
}

export async function clearPushToken(_userId: string): Promise<void> {
  // No remote token on web.
}

export async function showLocalNotification(
  _title?: string,
  _body?: string,
  _channelId = 'partner-activity',
): Promise<void> {
  if (pageIsVisible()) return
  try {
    const granted = await requestNotificationPermission()
    if (!granted) return
    const payload = {
      type: 'notify',
      title: LOCK_SCREEN_TITLE,
      body: LOCK_SCREEN_BODY,
    }
    const worker =
      typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined
    if (worker?.controller) {
      worker.controller.postMessage(payload)
      return
    }
    const NotificationApi = webNotificationApi()
    if (NotificationApi && NotificationApi.permission === 'granted') {
      new NotificationApi(LOCK_SCREEN_TITLE, { body: LOCK_SCREEN_BODY })
    }
  } catch (error) {
    reportError('notifications', error, { platform: 'web' })
  }
}

let dailyTimer: ReturnType<typeof setTimeout> | null = null
let snoozeTimer: ReturnType<typeof setTimeout> | null = null

function clearTimer(
  slot: 'daily' | 'snooze',
): void {
  if (slot === 'daily' && dailyTimer) {
    clearTimeout(dailyTimer)
    dailyTimer = null
  }
  if (slot === 'snooze' && snoozeTimer) {
    clearTimeout(snoozeTimer)
    snoozeTimer = null
  }
}

export async function cancelAllBondNotifications(): Promise<void> {
  clearTimer('daily')
  clearTimer('snooze')
}

export async function disableNotifications(): Promise<void> {
  await cancelAllBondNotifications()
}

function arm(
  slot: 'daily' | 'snooze',
  when: Date,
): void {
  clearTimer(slot)
  const wait = Math.max(1000, when.getTime() - Date.now())
  const timer = setTimeout(() => {
    void showLocalNotification()
  }, wait)
  if (slot === 'daily') dailyTimer = timer
  else snoozeTimer = timer
}

export async function syncLocalReminder(
  prefs: NotificationPrefs,
  options: { paired: boolean; completedToday: boolean },
): Promise<void> {
  clearTimer('daily')
  if (options.completedToday) clearTimer('snooze')
  const next = nextDailyReminderAt(new Date(), prefs, options)
  if (!next) return
  const granted = await requestNotificationPermission()
  if (!granted) return
  arm('daily', next)
}

export async function scheduleOneHourReminder(
  prefs: NotificationPrefs,
  completedToday: boolean,
): Promise<{ error: string | null; when: Date | null }> {
  if (completedToday) {
    return { error: "Today's check-in is already saved.", when: null }
  }
  const granted = await requestNotificationPermission()
  if (!granted) {
    return {
      error: 'Allow notifications to set a one-hour reminder.',
      when: null,
    }
  }
  const when = nextSnoozeAt(new Date(), prefs)
  arm('snooze', when)
  return { error: null, when }
}

export function subscribeNotificationTaps(_handlers: {
  onOpen: (url: string) => void
  onSnooze: () => void
}): () => void {
  return () => {}
}

export function expoGoAndroidRemoteUnsupported(): boolean {
  return false
}
