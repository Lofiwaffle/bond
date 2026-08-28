import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AppState } from 'react-native'
import { router, type Href } from 'expo-router'

import { useAuth } from '../lib/auth'
import { reportError } from '../lib/monitor'
import {
  cancelAllBondNotifications,
  clearPushToken,
  enableNotifications,
  expoGoAndroidRemoteUnsupported,
  registerPushToken,
  scheduleOneHourReminder,
  subscribeNotificationTaps,
  syncLocalReminder,
} from '../lib/notifications'
import {
  DEFAULT_NOTIFICATION_PREFS,
  detectTimezone,
  formatDailyTime,
  parseDailyTime,
  type NotificationPrefs,
} from '../lib/notificationSchedule'
import { supabase } from '../lib/supabase'
import { useTodayCheckIn } from './useCheckIn'

type NotificationContextValue = {
  prefs: NotificationPrefs
  loaded: boolean
  busy: boolean
  error: string | null
  expoGoNote: boolean
  patch: (partial: Partial<NotificationPrefs>) => Promise<void>
  remindInOneHour: () => Promise<{ error: string | null; when: Date | null }>
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
)

type PrefRow = {
  daily_enabled: boolean
  daily_time: string
  reveal_enabled: boolean
  timezone: string
  quiet_hours_enabled: boolean
  quiet_hours_start: number
  quiet_hours_end: number
}

function fromRow(row: PrefRow): NotificationPrefs {
  const time = parseDailyTime(row.daily_time)
  return {
    daily_enabled: Boolean(row.daily_enabled),
    daily_time: formatDailyTime(time.hour, time.minute),
    reveal_enabled: Boolean(row.reveal_enabled),
    timezone: row.timezone || detectTimezone(),
    quiet_hours_enabled: Boolean(row.quiet_hours_enabled),
    quiet_hours_start: Number(row.quiet_hours_start) || 22,
    quiet_hours_end: Number(row.quiet_hours_end) || 8,
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, profile, partner } = useAuth()
  const { mine, isLoading: checkInLoading } = useTodayCheckIn()
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  const paired = Boolean(profile?.couple_id && partner)
  const completedToday = Boolean(mine)

  const persist = useCallback(
    async (next: NotificationPrefs) => {
      if (!user?.id) return { error: 'Not signed in' }
      const time = parseDailyTime(next.daily_time)
      const { error: writeError } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          daily_enabled: next.daily_enabled,
          daily_time: `${formatDailyTime(time.hour, time.minute)}:00`,
          reveal_enabled: next.reveal_enabled,
          timezone: next.timezone,
          quiet_hours_enabled: next.quiet_hours_enabled,
          quiet_hours_start: next.quiet_hours_start,
          quiet_hours_end: next.quiet_hours_end,
          updated_at: new Date().toISOString(),
        })
      if (writeError) {
        reportError('notifications', writeError.message, { op: 'prefs' })
        return { error: writeError.message }
      }
      return { error: null }
    },
    [user?.id],
  )

  const load = useCallback(async () => {
    if (!user?.id) {
      setPrefs(DEFAULT_NOTIFICATION_PREFS)
      setLoaded(false)
      return
    }
    const { data, error: readError } = await supabase
      .from('notification_preferences')
      .select(
        'daily_enabled, daily_time, reveal_enabled, timezone, quiet_hours_enabled, quiet_hours_start, quiet_hours_end',
      )
      .eq('user_id', user.id)
      .maybeSingle()
    if (readError) {
      reportError('notifications', readError.message, { op: 'prefs-load' })
      setError(readError.message)
      setLoaded(true)
      return
    }
    const timezone = detectTimezone()
    const next = data
      ? fromRow(data as PrefRow)
      : { ...DEFAULT_NOTIFICATION_PREFS, timezone }
    if (next.timezone !== timezone) next.timezone = timezone
    setPrefs(next)
    setLoaded(true)
    if (!data || (data as PrefRow).timezone !== timezone) {
      await persist(next)
    }
  }, [persist, user?.id])

  useEffect(() => {
    void load()
  }, [load])

  const patch = useCallback(
    async (partial: Partial<NotificationPrefs>) => {
      if (!user?.id || busy) return
      setError(null)
      setBusy(true)
      const next: NotificationPrefs = {
        ...prefsRef.current,
        ...partial,
        timezone: detectTimezone(),
      }
      if (next.daily_enabled || next.reveal_enabled) {
        const granted = await enableNotifications(
          next.reveal_enabled ? user.id : null,
        )
        if (!granted) {
          setError(
            'Allow notifications in your browser or phone settings first.',
          )
          setBusy(false)
          return
        }
      }
      if (user.id) {
        if (next.reveal_enabled) await registerPushToken(user.id)
        else await clearPushToken(user.id)
      }
      const result = await persist(next)
      setBusy(false)
      if (result.error) {
        setError(result.error)
        return
      }
      setPrefs(next)
    },
    [busy, persist, user?.id],
  )

  const remindInOneHour = useCallback(async () => {
    return scheduleOneHourReminder(prefsRef.current, completedToday)
  }, [completedToday])

  useEffect(() => {
    if (!loaded || checkInLoading || !user?.id) return
    if (!paired) {
      void cancelAllBondNotifications()
      return
    }
    void syncLocalReminder(prefs, { paired, completedToday })
  }, [checkInLoading, completedToday, loaded, paired, prefs, user?.id])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !user?.id) return
      const timezone = detectTimezone()
      if (timezone !== prefsRef.current.timezone) {
        void patch({ timezone })
      } else if (paired) {
        void syncLocalReminder(prefsRef.current, {
          paired,
          completedToday,
        })
      }
    })
    return () => sub.remove()
  }, [completedToday, paired, patch, user?.id])

  useEffect(() => {
    return subscribeNotificationTaps({
      onOpen: (url) => {
        router.replace(url as Href)
      },
      onSnooze: () => {
        void scheduleOneHourReminder(prefsRef.current, completedToday)
      },
    })
  }, [completedToday])

  const value = useMemo<NotificationContextValue>(
    () => ({
      prefs,
      loaded,
      busy,
      error,
      expoGoNote: expoGoAndroidRemoteUnsupported(),
      patch,
      remindInOneHour,
    }),
    [busy, error, loaded, patch, prefs, remindInOneHour],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationPreferences(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotificationPreferences must be used within NotificationProvider')
  }
  return ctx
}
