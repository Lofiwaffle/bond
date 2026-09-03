import { LOCK_SCREEN_BODY, LOCK_SCREEN_TITLE } from './notificationCopy'
import { defaultTogetherStart } from './googleCalendarUrl'
import { openGoogleCalendarEvent } from './googleCalendar'
import { reportError } from './monitor'
import { supabase } from './supabase'
import type { PlayLauncherItem } from './plays'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export const TOGETHER_SCHEDULED_EVENT = 'together_scheduled'

export function togetherCalendarTitle(item: PlayLauncherItem): string {
  return `Bond: ${item.title}`
}

export function togetherCalendarDetails(item: PlayLauncherItem): string {
  return [
    item.body,
    'One of you picked this in Bond. No approval needed — just show up if you can.',
  ].join('\n\n')
}

export async function notifyPartnerTogether(args: {
  coupleId: string
  actorId: string
  title: string
  partnerPushToken?: string | null
}): Promise<{ error: string | null }> {
  const { error: insertError } = await supabase.from('partner_signals').insert({
    couple_id: args.coupleId,
    actor_id: args.actorId,
    event_type: TOGETHER_SCHEDULED_EVENT,
    summary: 'scheduled a together time',
  })
  if (insertError) {
    reportError('supabase', insertError.message, { op: 'together-signal' })
    return { error: insertError.message }
  }

  const token = args.partnerPushToken?.trim()
  if (!token) return { error: null }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        sound: 'default',
        title: LOCK_SCREEN_TITLE,
        body: LOCK_SCREEN_BODY,
        channelId: 'partner-activity',
        data: {
          type: TOGETHER_SCHEDULED_EVENT,
          title: args.title,
          url: '/(app)/(tabs)/stats',
        },
      }),
    })
    if (!response.ok) {
      reportError('app', `expo push ${response.status}`, { op: 'together-push' })
    }
  } catch (error) {
    reportError('app', error instanceof Error ? error.message : 'push failed', {
      op: 'together-push',
    })
  }
  return { error: null }
}

/** One person picks. Opens a calendar invite and notifies the other. No mutual approval. */
export async function scheduleTogetherActivity(args: {
  item: PlayLauncherItem
  coupleId: string
  actorId: string
  partnerPushToken?: string | null
  now?: Date
}): Promise<{ error: string | null }> {
  const start = defaultTogetherStart(args.now)
  const calendar = await openGoogleCalendarEvent({
    title: togetherCalendarTitle(args.item),
    details: togetherCalendarDetails(args.item),
    start,
    durationMinutes: 60,
  })
  const notify = await notifyPartnerTogether({
    coupleId: args.coupleId,
    actorId: args.actorId,
    title: args.item.title,
    partnerPushToken: args.partnerPushToken,
  })
  return { error: calendar.error ?? notify.error }
}
