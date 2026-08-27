import { AppState, Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

import { reportError } from './monitor'
import { LOCK_SCREEN_BODY, LOCK_SCREEN_TITLE } from './notificationCopy'
import {
  NOTIFICATION_DESTINATION,
  type NotificationPrefs,
  nextDailyReminderAt,
  nextSnoozeAt,
  safeNotificationUrl,
} from './notificationSchedule'
import { supabase } from './supabase'

const DAILY_ID = 'bond.daily'
const SNOOZE_ID = 'bond.snooze'
const LEGACY_REMINDER_ID_KEY = 'bond.checkin.reminderId'
const LEGACY_REMINDER_IDS_KEY = 'bond.checkin.reminderIds'
const CATEGORY_ID = 'bondcheckin'
const SNOOZE_ACTION = 'snooze_hour'

export const CHECK_IN_REMINDER_HOUR = 20
export const CHECK_IN_REMINDER_MINUTE = 0

Notifications.setNotificationHandler({
  handleNotification: async () => {
    const inApp = AppState.currentState === 'active'
    return {
      shouldShowBanner: !inApp,
      shouldShowList: true,
      shouldPlaySound: !inApp,
      shouldSetBadge: false,
    }
  },
})

const LOCK_SCREEN_CONTENT = {
  title: LOCK_SCREEN_TITLE,
  body: LOCK_SCREEN_BODY,
  sound: 'default' as const,
  interruptionLevel: 'passive' as const,
  categoryIdentifier: CATEGORY_ID,
}

function destinationData(type: 'daily' | 'snooze' | 'reveal') {
  return { url: NOTIFICATION_DESTINATION, type }
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

export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync()
    return current.granted
  } catch {
    return false
  }
}

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return
  const lockScreen = {
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  }
  await Notifications.setNotificationChannelAsync('bond-reminders', {
    name: 'Check-in reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    ...lockScreen,
  })
  await Notifications.setNotificationChannelAsync('partner-activity', {
    name: 'Partner activity',
    importance: Notifications.AndroidImportance.DEFAULT,
    ...lockScreen,
  })
}

async function ensureCategories(): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      {
        identifier: SNOOZE_ACTION,
        buttonTitle: 'Remind me in one hour',
        options: { opensAppToForeground: false },
      },
    ])
  } catch (error) {
    reportError('notifications', error, { op: 'category' })
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

export async function clearPushToken(userId: string): Promise<void> {
  try {
    await supabase
      .from('profiles')
      .update({ expo_push_token: null })
      .eq('id', userId)
  } catch (error) {
    reportError('notifications', error, { op: 'clear-token' })
  }
}

async function cancelId(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id)
  } catch {
    // Already gone.
  }
}

export async function cancelAllBondNotifications(): Promise<void> {
  await cancelId(DAILY_ID)
  await cancelId(SNOOZE_ID)
  const legacy = await AsyncStorage.getItem(LEGACY_REMINDER_ID_KEY)
  if (legacy) {
    await cancelId(legacy)
    await AsyncStorage.removeItem(LEGACY_REMINDER_ID_KEY)
  }
  const rawIds = await AsyncStorage.getItem(LEGACY_REMINDER_IDS_KEY)
  if (rawIds) {
    try {
      const ids = JSON.parse(rawIds) as unknown
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id === 'string') await cancelId(id)
        }
      }
    } catch {
      // Ignore malformed storage.
    }
    await AsyncStorage.removeItem(LEGACY_REMINDER_IDS_KEY)
  }
}

export async function disableNotifications(): Promise<void> {
  await cancelAllBondNotifications()
}

export async function enableNotifications(
  userId?: string | null,
): Promise<boolean> {
  const granted = await requestNotificationPermission()
  if (!granted) return false
  await ensureAndroidChannels()
  await ensureCategories()
  if (userId) await registerPushToken(userId)
  return true
}

export async function showLocalNotification(
  _title?: string,
  _body?: string,
  channelId = 'partner-activity',
): Promise<void> {
  if (AppState.currentState === 'active') return
  try {
    const allowed = await requestNotificationPermission()
    if (!allowed) return
    await ensureAndroidChannels()
    await Notifications.scheduleNotificationAsync({
      content: {
        ...LOCK_SCREEN_CONTENT,
        data: destinationData('reveal'),
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
      trigger: null,
    })
  } catch (error) {
    reportError('notifications', error, { op: 'local' })
  }
}

async function scheduleAt(
  id: string,
  when: Date,
  type: 'daily' | 'snooze',
): Promise<void> {
  await cancelId(id)
  if (when.getTime() <= Date.now() + 2000) return
  await ensureAndroidChannels()
  await ensureCategories()
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      ...LOCK_SCREEN_CONTENT,
      data: destinationData(type),
      ...(Platform.OS === 'android' ? { channelId: 'bond-reminders' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
    },
  })
}

export async function syncLocalReminder(
  prefs: NotificationPrefs,
  options: { paired: boolean; completedToday: boolean },
): Promise<void> {
  try {
    await cancelId(DAILY_ID)
    if (options.completedToday) await cancelId(SNOOZE_ID)
    const next = nextDailyReminderAt(new Date(), prefs, options)
    if (!next) return
    const granted = await requestNotificationPermission()
    if (!granted) return
    await scheduleAt(DAILY_ID, next, 'daily')
  } catch (error) {
    reportError('notifications', error, { op: 'reminder' })
  }
}

export async function scheduleOneHourReminder(
  prefs: NotificationPrefs,
  completedToday: boolean,
): Promise<{ error: string | null; when: Date | null }> {
  if (completedToday) {
    return { error: "Today's check-in is already saved.", when: null }
  }
  try {
    const granted = await requestNotificationPermission()
    if (!granted) {
      return {
        error: 'Allow notifications to set a one-hour reminder.',
        when: null,
      }
    }
    const when = nextSnoozeAt(new Date(), prefs)
    await scheduleAt(SNOOZE_ID, when, 'snooze')
    return { error: null, when }
  } catch (error) {
    reportError('notifications', error, { op: 'snooze' })
    return { error: 'Could not set a reminder.', when: null }
  }
}

export function subscribeNotificationTaps(handlers: {
  onOpen: (url: string) => void
  onSnooze: () => void
}): () => void {
  const respond = (response: Notifications.NotificationResponse) => {
    if (response.actionIdentifier === SNOOZE_ACTION) {
      handlers.onSnooze()
      return
    }
    const data = response.notification.request.content.data as
      | { url?: unknown }
      | undefined
    handlers.onOpen(safeNotificationUrl(data?.url))
  }

  const sub = Notifications.addNotificationResponseReceivedListener(respond)
  void Notifications.getLastNotificationResponseAsync().then((last) => {
    if (!last) return
    respond(last)
    void Notifications.clearLastNotificationResponseAsync()
  })
  return () => sub.remove()
}

export function expoGoAndroidRemoteUnsupported(): boolean {
  return (
    Platform.OS === 'android' &&
    (Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === 'storeClient')
  )
}
