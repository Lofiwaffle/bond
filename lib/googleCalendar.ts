import AsyncStorage from '@react-native-async-storage/async-storage'
import { Linking, Platform } from 'react-native'

import { addDays } from './dates'
import {
  googleCalendarEventUrl,
  type CalendarEvent,
} from './googleCalendarUrl'

export {
  compactLocalDateTime,
  defaultTogetherStart,
  googleCalendarEventUrl,
  type CalendarEvent,
} from './googleCalendarUrl'

const MARKS_KEY = 'bond.goalCalendar.v1'

export type CalendarGoal = {
  id?: string
  outcome: string
  successCriteria?: string | null
  realisticPlan?: string | null
  why?: string | null
  deadline: string
}

function compactDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '')
}

/** All-day Google Calendar event for a goal deadline. End date is exclusive. */
export function googleCalendarDeadlineUrl(goal: CalendarGoal): string {
  const start = compactDate(goal.deadline)
  const end = compactDate(addDays(goal.deadline.slice(0, 10), 1))
  const details = [
    goal.successCriteria?.trim()
      ? `Success: ${goal.successCriteria.trim()}`
      : null,
    goal.realisticPlan?.trim() ? `Plan: ${goal.realisticPlan.trim()}` : null,
    goal.why?.trim() ? `Why it matters: ${goal.why.trim()}` : null,
    'Shared goal from Bond',
  ]
    .filter(Boolean)
    .join('\n\n')

  const query = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(goal.outcome.trim())}`,
    `dates=${start}/${end}`,
    `details=${encodeURIComponent(details)}`,
  ].join('&')

  return `https://calendar.google.com/calendar/render?${query}`
}

export async function loadCalendarMarks(): Promise<Record<string, true>> {
  try {
    const raw = await AsyncStorage.getItem(MARKS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => value === true),
    ) as Record<string, true>
  } catch {
    return {}
  }
}

export async function markGoalOnCalendar(goalId: string): Promise<void> {
  const marks = await loadCalendarMarks()
  marks[goalId] = true
  await AsyncStorage.setItem(MARKS_KEY, JSON.stringify(marks))
}

export async function openGoogleCalendarDeadline(
  goal: CalendarGoal,
): Promise<{ error: string | null }> {
  const deadline = goal.deadline.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return {
      error: 'This goal needs a deadline before it can go on Google Calendar.',
    }
  }

  const url = googleCalendarDeadlineUrl({ ...goal, deadline })
  try {
    await Linking.openURL(url)
    if (goal.id) await markGoalOnCalendar(goal.id)
    return { error: null }
  } catch {
    return { error: 'Could not open Google Calendar.' }
  }
}

export async function openGoogleCalendarEvent(
  event: CalendarEvent,
): Promise<{ error: string | null }> {
  if (!event.title.trim()) {
    return { error: 'This needs a title before it can go on the calendar.' }
  }
  const url = googleCalendarEventUrl(event)
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.open === 'function') {
      const opened = window.open(url, '_blank', 'noopener,noreferrer')
      if (!opened) await Linking.openURL(url)
      return { error: null }
    }
    await Linking.openURL(url)
    return { error: null }
  } catch {
    return { error: 'Could not open Google Calendar.' }
  }
}
