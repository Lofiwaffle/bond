/** Safe in-app destination for notification taps. Feed lives at `/`. */
export const NOTIFICATION_DESTINATION = '/'

export const DEFAULT_DAILY_TIME = '20:00'
export const DEFAULT_QUIET_START = 22
export const DEFAULT_QUIET_END = 8

export type NotificationPrefs = {
  daily_enabled: boolean
  daily_time: string
  reveal_enabled: boolean
  timezone: string
  quiet_hours_enabled: boolean
  quiet_hours_start: number
  quiet_hours_end: number
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  daily_enabled: false,
  daily_time: DEFAULT_DAILY_TIME,
  reveal_enabled: false,
  timezone: 'UTC',
  quiet_hours_enabled: false,
  quiet_hours_start: DEFAULT_QUIET_START,
  quiet_hours_end: DEFAULT_QUIET_END,
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

export function parseDailyTime(value: string | null | undefined): {
  hour: number
  minute: number
} {
  const match = /^(\d{1,2}):(\d{2})/.exec(value?.trim() ?? '')
  const hour = Number(match?.[1] ?? 20)
  const minute = Number(match?.[2] ?? 0)
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 20,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  }
}

export function formatDailyTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function shiftDailyTime(value: string, deltaMinutes: number): string {
  const parsed = parseDailyTime(value)
  let total = parsed.hour * 60 + parsed.minute + deltaMinutes
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  return formatDailyTime(Math.floor(total / 60), total % 60)
}

export function formatHourLabel(hour: number): string {
  const wrapped = ((hour % 24) + 24) % 24
  const suffix = wrapped >= 12 ? 'PM' : 'AM'
  const twelve = wrapped % 12 === 0 ? 12 : wrapped % 12
  return `${twelve}:00 ${suffix}`
}

export function formatClockLabel(value: string | Date): string {
  if (value instanceof Date) {
    return formatHourMinute(value.getHours(), value.getMinutes())
  }
  const parsed = parseDailyTime(value)
  return formatHourMinute(parsed.hour, parsed.minute)
}

function formatHourMinute(hour: number, minute: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return `${twelve}:${String(minute).padStart(2, '0')} ${suffix}`
}

export function wrapHour(hour: number, delta = 0): number {
  return (((hour + delta) % 24) + 24) % 24
}

export function isInQuietHours(
  hour: number,
  enabled: boolean,
  startHour: number,
  endHour: number,
): boolean {
  if (!enabled) return false
  if (startHour === endHour) return false
  if (startHour < endHour) return hour >= startHour && hour < endHour
  return hour >= startHour || hour < endHour
}

function atLocalTime(base: Date, hour: number, minute: number): Date {
  const next = new Date(base)
  next.setHours(hour, minute, 0, 0)
  return next
}

function skipQuietHours(when: Date, prefs: NotificationPrefs): Date {
  if (
    !isInQuietHours(
      when.getHours(),
      prefs.quiet_hours_enabled,
      prefs.quiet_hours_start,
      prefs.quiet_hours_end,
    )
  ) {
    return when
  }
  const end = atLocalTime(when, prefs.quiet_hours_end, 0)
  if (end.getTime() <= when.getTime()) end.setDate(end.getDate() + 1)
  return end
}

/** Next optional daily fire. Null if the reminder is off or the couple is unpaired. */
export function nextDailyReminderAt(
  now: Date,
  prefs: NotificationPrefs,
  options: { paired: boolean; completedToday: boolean },
): Date | null {
  if (!prefs.daily_enabled || !options.paired) return null
  const { hour, minute } = parseDailyTime(prefs.daily_time)
  let candidate = atLocalTime(now, hour, minute)
  if (options.completedToday || candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1)
  }
  return skipQuietHours(candidate, prefs)
}

export function nextSnoozeAt(now: Date, prefs: NotificationPrefs): Date {
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)
  return skipQuietHours(inOneHour, prefs)
}

const ALLOWED_URLS = new Set(['/', '/(app)/(tabs)'])

export function safeNotificationUrl(value: unknown): string {
  if (typeof value === 'string' && ALLOWED_URLS.has(value)) return value
  return NOTIFICATION_DESTINATION
}
