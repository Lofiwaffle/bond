function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** Local wall time, no timezone suffix — Google Calendar treats this as the opener's timezone. */
export function compactLocalDateTime(date: Date): string {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}T${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
}

/** Tonight at 7pm, or one hour from now if that has already passed. */
export function defaultTogetherStart(now = new Date()): Date {
  const start = new Date(now.getTime())
  start.setHours(19, 0, 0, 0)
  if (start.getTime() <= now.getTime()) {
    return new Date(now.getTime() + 60 * 60 * 1000)
  }
  return start
}

export type CalendarEvent = {
  title: string
  details?: string
  location?: string
  start: Date
  durationMinutes?: number
  guestEmail?: string | null
}

export function calendarEventEnd(event: CalendarEvent): Date {
  const duration =
    event.durationMinutes && event.durationMinutes > 0 ? event.durationMinutes : 60
  return new Date(event.start.getTime() + duration * 60 * 1000)
}

export function googleCalendarEventUrl(event: CalendarEvent): string {
  const end = calendarEventEnd(event)
  const query = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(event.title.trim())}`,
    `dates=${compactLocalDateTime(event.start)}/${compactLocalDateTime(end)}`,
    `details=${encodeURIComponent((event.details ?? '').trim())}`,
  ]
  const location = event.location?.trim()
  if (location) {
    query.push(`location=${encodeURIComponent(location)}`)
  }
  const guest = event.guestEmail?.trim()
  if (guest && guest.includes('@')) {
    query.push(`add=${encodeURIComponent(guest)}`)
  }
  return `https://calendar.google.com/calendar/render?${query.join('&')}`
}
