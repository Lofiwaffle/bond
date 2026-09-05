import { opensCalendarOnTogetherTap } from './datePlan'
import { LOCK_SCREEN_BODY, LOCK_SCREEN_TITLE } from './notificationCopy'
import { defaultTogetherStart } from './googleCalendarUrl'
import { scheduleCalendarEvent } from './deviceCalendar'
import { reportError } from './monitor'
import { supabase } from './supabase'
import {
  TOGETHER_SCHEDULED_EVENT,
  TOGETHER_SIGNAL_SETUP_NOTICE,
  isMissingSignalPolicy,
} from './togetherSignal'
import type { PlayLauncherItem } from './plays'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export {
  TOGETHER_SCHEDULED_EVENT,
  TOGETHER_SIGNAL_SETUP_NOTICE,
  isMissingSignalPolicy,
}

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
}): Promise<{ error: string | null; notice?: string }> {
  const { error: insertError } = await supabase.from('partner_signals').insert({
    couple_id: args.coupleId,
    actor_id: args.actorId,
    event_type: TOGETHER_SCHEDULED_EVENT,
    summary: 'scheduled a together time',
  })
  if (insertError) {
    // A missing catch-up policy is a setup gap, not a crash: keep the pick, skip the nudge.
    if (isMissingSignalPolicy(insertError.message)) {
      return { error: null, notice: TOGETHER_SIGNAL_SETUP_NOTICE }
    }
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
}): Promise<{
  error: string | null
  placed?: 'device' | 'google'
  notice?: string
}> {
  let calendarError: string | null = null
  let placed: 'device' | 'google' | undefined
  if (opensCalendarOnTogetherTap(args.item.kind)) {
    const start = defaultTogetherStart(args.now)
    const calendar = await scheduleCalendarEvent({
      title: togetherCalendarTitle(args.item),
      details: togetherCalendarDetails(args.item),
      start,
      durationMinutes: 60,
    })
    calendarError = calendar.error
    placed = calendar.placed
  }
  const notify = await notifyPartnerTogether({
    coupleId: args.coupleId,
    actorId: args.actorId,
    title: args.item.title,
    partnerPushToken: args.partnerPushToken,
  })
  return { error: calendarError ?? notify.error, placed, notice: notify.notice }
}
