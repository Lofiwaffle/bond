type CheckInRecord = {
  id: string
  couple_id: string
  user_id: string
  check_in_date: string
  score: number
  note: string | null
}

type ProfileRow = {
  id: string
  display_name: string
  expo_push_token: string | null
  quiet_hours_enabled: boolean | null
  quiet_hours_start: number | null
  quiet_hours_end: number | null
  timezone: string | null
}

type WebhookBody = {
  type?: string
  table?: string
  record?: CheckInRecord
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const MILESTONE_THRESHOLDS = [7, 25, 50, 100] as const
/** Lock-screen copy must stay generic. Never include scores, notes, or names. */
const PUSH_TITLE = 'Bond'
const PUSH_BODY = 'Open the app when you have a minute.'

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Missing Supabase env' }, 500)
  }

  let body: WebhookBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const record = body.record
  if (!record?.couple_id || !record?.user_id || !record?.check_in_date) {
    return json({ error: 'Missing check-in record' }, 400)
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }
  const readHeaders = { ...headers, Prefer: 'return=representation' }

  const profilesRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?couple_id=eq.${record.couple_id}&select=id,display_name,expo_push_token,quiet_hours_enabled,quiet_hours_start,quiet_hours_end,timezone`,
    { headers: readHeaders },
  )
  if (!profilesRes.ok) {
    return json({ error: await profilesRes.text() }, 500)
  }

  const profiles = (await profilesRes.json()) as ProfileRow[]
  const partner = profiles.find((p) => p.id !== record.user_id)

  const partnerCheckRes = await fetch(
    `${supabaseUrl}/rest/v1/daily_check_ins?couple_id=eq.${record.couple_id}&user_id=eq.${partner?.id ?? '00000000-0000-0000-0000-000000000000'}&check_in_date=eq.${record.check_in_date}&select=id`,
    { headers: readHeaders },
  )
  if (!partnerCheckRes.ok) {
    return json({ error: await partnerCheckRes.text() }, 500)
  }

  const partnerRows = (await partnerCheckRes.json()) as { id: string }[]
  const bothIn = Boolean(partner && partnerRows.length > 0)
  const eventType = bothIn ? 'reveal_ready' : 'partner_checked_in'

  let partnerNotify: Record<string, unknown> = { skipped: 'no_partner' }
  if (partner) {
    partnerNotify = await notifyRecipient({
      supabaseUrl,
      headers,
      recipient: partner,
      coupleId: record.couple_id,
      eventDate: record.check_in_date,
      eventType,
      title: PUSH_TITLE,
      body: PUSH_BODY,
      channelId: 'partner-activity',
      data: {
        type: eventType,
        check_in_date: record.check_in_date,
        couple_id: record.couple_id,
      },
    })
  }

  const milestones: Record<string, unknown>[] = []
  if (bothIn) {
    const mutual = await countMutualReveals(
      supabaseUrl,
      readHeaders,
      record.couple_id,
    )
    const previous = Math.max(0, mutual - 1)
    for (const threshold of MILESTONE_THRESHOLDS) {
      if (previous < threshold && mutual >= threshold) {
        for (const recipient of profiles) {
          const result = await notifyRecipient({
            supabaseUrl,
            headers,
            recipient,
            coupleId: record.couple_id,
            // Once per lifetime threshold (fixed date + typed event)
            eventDate: '1970-01-01',
            eventType: `milestone_${threshold}`,
            title: PUSH_TITLE,
            body: PUSH_BODY,
            channelId: 'partner-activity',
            data: {
              type: 'milestone',
              threshold,
              couple_id: record.couple_id,
              check_in_date: record.check_in_date,
            },
          })
          milestones.push({
            threshold,
            recipient: recipient.id,
            ...result,
          })
        }
      }
    }
  }

  return json({
    ok: true,
    bothIn,
    eventType,
    partnerNotify,
    milestones,
  })
})

async function countMutualReveals(
  supabaseUrl: string,
  headers: Record<string, string>,
  coupleId: string,
): Promise<number> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/daily_check_ins?couple_id=eq.${coupleId}&select=check_in_date,user_id`,
    { headers },
  )
  if (!res.ok) return 0
  const rows = (await res.json()) as { check_in_date: string; user_id: string }[]
  const byDate = new Map<string, Set<string>>()
  for (const row of rows) {
    const set = byDate.get(row.check_in_date) ?? new Set()
    set.add(row.user_id)
    byDate.set(row.check_in_date, set)
  }
  let mutual = 0
  for (const users of byDate.values()) {
    if (users.size >= 2) mutual += 1
  }
  return mutual
}

async function notifyRecipient(args: {
  supabaseUrl: string
  headers: Record<string, string>
  recipient: ProfileRow
  coupleId: string
  eventDate: string
  eventType: string
  title: string
  body: string
  channelId: string
  data: Record<string, unknown>
}): Promise<Record<string, unknown>> {
  const { recipient } = args
  if (!recipient.expo_push_token) {
    return { skipped: 'no_partner_token' }
  }

  if (
    isInQuietHoursNow(
      recipient.quiet_hours_enabled ?? false,
      recipient.quiet_hours_start ?? 22,
      recipient.quiet_hours_end ?? 8,
      recipient.timezone ?? 'America/New_York',
    )
  ) {
    return { skipped: 'quiet_hours' }
  }

  const dedupeRes = await fetch(
    `${args.supabaseUrl}/rest/v1/notification_dedupe`,
    {
      method: 'POST',
      headers: args.headers,
      body: JSON.stringify({
        couple_id: args.coupleId,
        event_date: args.eventDate,
        event_type: args.eventType,
        recipient_user_id: recipient.id,
      }),
    },
  )

  if (!dedupeRes.ok) {
    const text = await dedupeRes.text()
    if (dedupeRes.status === 409 || text.includes('duplicate')) {
      return { skipped: 'deduped', eventType: args.eventType }
    }
    return { error: text }
  }

  const pushResponse = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: recipient.expo_push_token,
      sound: 'default',
      title: args.title,
      body: args.body,
      channelId: args.channelId,
      data: args.data,
    }),
  })

  const pushJson = await pushResponse.json().catch(() => null)
  if (!pushResponse.ok) {
    return {
      error: 'Expo push failed',
      status: pushResponse.status,
      pushJson,
    }
  }

  return { sent: true, eventType: args.eventType, pushJson }
}

function isInQuietHoursNow(
  enabled: boolean,
  startHour: number,
  endHour: number,
  timezone: string,
): boolean {
  if (!enabled) return false
  if (startHour === endHour) return false

  const hour = hourInTimezone(timezone)
  if (startHour < endHour) {
    return hour >= startHour && hour < endHour
  }
  return hour >= startHour || hour < endHour
}

function hourInTimezone(timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(new Date())
    const hourPart = parts.find((p) => p.type === 'hour')
    return Number.parseInt(hourPart?.value ?? '0', 10)
  } catch {
    return new Date().getUTCHours()
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
