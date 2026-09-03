import { Platform } from 'react-native'

import { openGoogleCalendarEvent } from './googleCalendar'
import { calendarEventEnd, type CalendarEvent } from './googleCalendarUrl'

export type CalendarPlacement = 'device' | 'google'

export type ScheduleCalendarResult = {
  error: string | null
  placed: CalendarPlacement
}

async function pickWritableCalendar(
  Calendar: typeof import('expo-calendar'),
) {
  if (Platform.OS === 'ios') {
    return Calendar.getDefaultCalendarSync()
  }
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT)
  return (
    calendars.find((item) => item.isPrimary && item.allowsModifications) ??
    calendars.find((item) => item.allowsModifications) ??
    null
  )
}

async function placeOnDeviceCalendar(
  event: CalendarEvent,
): Promise<ScheduleCalendarResult | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null

  const Calendar = await import('expo-calendar')
  const writeOnly = Platform.OS === 'ios'
  const permission = await Calendar.requestCalendarPermissions(writeOnly)
  let granted = permission.status === 'granted'
  if (!granted && writeOnly) {
    const full = await Calendar.requestCalendarPermissions(false)
    granted = full.status === 'granted'
  }
  if (!granted) return null

  const calendar = await pickWritableCalendar(Calendar)

  if (!calendar) return null

  await calendar.createEvent({
    title: event.title.trim(),
    notes: event.details?.trim() || undefined,
    location: event.location?.trim() || undefined,
    startDate: event.start,
    endDate: calendarEventEnd(event),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
    alarms: [{ relativeOffset: -60 }],
  })
  return { error: null, placed: 'device' }
}

/** iOS/Android: write the event onto the device calendar. Web, Expo Go, or a denied permission falls back to Google Calendar. */
export async function scheduleCalendarEvent(
  event: CalendarEvent,
): Promise<ScheduleCalendarResult> {
  if (!event.title.trim()) {
    return { error: 'This needs a title before it can go on the calendar.', placed: 'google' }
  }

  try {
    const placed = await placeOnDeviceCalendar(event)
    if (placed) return placed
  } catch {
    // Expo Go, missing native module, or a denied calendar — open Google Calendar instead.
  }

  const fallback = await openGoogleCalendarEvent(event)
  return { error: fallback.error, placed: 'google' }
}
