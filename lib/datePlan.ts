import { formatDisplayDate, localDateString } from './dates'
import type { CalendarEvent } from './googleCalendarUrl'

export type DateWhenTime = 'afternoon' | 'evening' | 'night'

export type DatePlanAnswer = {
  what: string
  when: string
  whenTime: DateWhenTime
  where: string
  why: string
}

export type DateDayChip = {
  iso: string
  label: string
  weekday: string
}

export const DATE_WHERE_SUGGESTIONS = [
  'A cozy cafe',
  'Our place',
  'A park nearby',
  'A restaurant we like',
  'Somewhere we can walk',
  'Stay in',
  'Surprise me',
] as const

export const DATE_WHEN_TIMES: { id: DateWhenTime; label: string; hour: number }[] = [
  { id: 'afternoon', label: 'Afternoon', hour: 14 },
  { id: 'evening', label: 'Evening', hour: 18 },
  { id: 'night', label: 'Night', hour: 20 },
]

/** Tile tap opens a calendar for other Together items, not for the date planner. */
export function opensCalendarOnTogetherTap(kind: string): boolean {
  return kind !== 'choose_date'
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

export function upcomingDateChips(count = 10, from = new Date()): DateDayChip[] {
  const chips: DateDayChip[] = []
  for (let index = 0; index < count; index += 1) {
    const day = new Date(from)
    day.setHours(12, 0, 0, 0)
    day.setDate(day.getDate() + index)
    const weekday = day.toLocaleDateString(undefined, { weekday: 'short' })
    const monthDay = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    chips.push({
      iso: localDateString(day),
      weekday,
      label: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : `${weekday} ${monthDay}`,
    })
  }
  return chips
}

export function dateWhenHour(time: DateWhenTime): number {
  return DATE_WHEN_TIMES.find((item) => item.id === time)?.hour ?? 18
}

export function datePlanStart(when: string, whenTime: DateWhenTime): Date {
  const [year, month, day] = when.split('-').map((part) => Number(part))
  return new Date(year, month - 1, day, dateWhenHour(whenTime), 0, 0, 0)
}

export function datePlanLabel(when: string, whenTime: DateWhenTime): string {
  const time = DATE_WHEN_TIMES.find((item) => item.id === whenTime)?.label ?? 'Evening'
  return `${formatDisplayDate(when)} · ${time}`
}

export function normalizeDatePlan(value: unknown): DatePlanAnswer | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const what = typeof record.what === 'string' ? record.what.trim() : ''
  const when = typeof record.when === 'string' ? record.when.trim() : ''
  const where = typeof record.where === 'string' ? record.where.trim() : ''
  const why = typeof record.why === 'string' ? record.why.trim() : ''
  const whenTime = record.whenTime
  if (!what || !isIsoDate(when) || !where) return null
  if (whenTime !== 'afternoon' && whenTime !== 'evening' && whenTime !== 'night') {
    return null
  }
  return { what, when, whenTime, where, why }
}

export function datePlanReady(plan: {
  what: string
  when: string
  where: string
}): boolean {
  return Boolean(plan.what.trim() && isIsoDate(plan.when) && plan.where.trim())
}

export function datePlanCalendarEvent(plan: DatePlanAnswer): CalendarEvent {
  const details = [
    `What: ${plan.what}`,
    `Where: ${plan.where}`,
    plan.why.trim() ? `Why: ${plan.why.trim()}` : '',
    'Scheduled from Bond.',
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    title: `Bond: ${plan.what}`,
    details,
    start: datePlanStart(plan.when, plan.whenTime),
    durationMinutes: 120,
  }
}
