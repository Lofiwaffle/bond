type ProfileRow = {
  id: string
  couple_id: string | null
  display_name: string
  expo_push_token: string | null
  quiet_hours_enabled: boolean | null
  quiet_hours_start: number | null
  quiet_hours_end: number | null
  timezone: string | null
}

type SpecialDateRow = {
  id: string
  couple_id: string
  kind: string
  label: string
  month: number
  day: number
  year: number | null
  recurs_annually: boolean
  remind_days_before: number
}

type Body = {
  today?: string
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Missing Supabase env' }, 500)
  }

  let body: Body = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const today = body.today && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
    ? body.today
    : utcDateString(new Date())

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }
  const readHeaders = { ...headers, Prefer: 'return=representation' }

  const datesRes = await fetch(
    `${supabaseUrl}/rest/v1/special_dates?select=id,couple_id,kind,label,month,day,year,recurs_annually,remind_days_before`,
    { headers: readHeaders },
  )
  if (!datesRes.ok) {
    return json({ error: await datesRes.text() }, 500)
  }
  const dates = (await datesRes.json()) as SpecialDateRow[]

  const due: {
    row: SpecialDateRow
    occurrence: string
    title: string
  }[] = []

  for (const row of dates) {
    const occurrence = nextOccurrence(row.month, row.day, today)
    if (!occurrence) continue
    const lead = daysUntil(occurrence, today)
    if (lead === row.remind_days_before) {
      due.push({
        row,
        occurrence,
        title: specialDateTitle(row.kind, row.label),
      })
    }
  }

  if (due.length === 0) {
    return json({ ok: true, today, due: 0, results: [] })
  }

  const coupleIds = [...new Set(due.map((d) => d.row.couple_id))]
  const profilesRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?couple_id=in.(${coupleIds.join(',')})&select=id,couple_id,display_name,expo_push_token,quiet_hours_enabled,quiet_hours_start,quiet_hours_end,timezone`,
    { headers: readHeaders },
  )
  if (!profilesRes.ok) {
    return json({ error: await profilesRes.text() }, 500)
  }
  const profiles = (await profilesRes.json()) as ProfileRow[]

  const results: Record<string, unknown>[] = []

  for (const item of due) {
    const members = profiles.filter((p) => p.couple_id === item.row.couple_id)
    const bodyText =
      item.occurrence === today
        ? `${item.title} is today.`
        : `${item.title} is in ${item.row.remind_days_before} day${
            item.row.remind_days_before === 1 ? '' : 's'
          }.`

    for (const recipient of members) {
      const outcome = await notifyRecipient({
        supabaseUrl,
        headers,
        recipient,
        coupleId: item.row.couple_id,
        eventDate: item.occurrence,
        eventType: 'special_date_soon',
        title: 'Bond',
        body: bodyText,
        channelId: 'special-dates',
        data: {
          type: 'special_date_soon',
          special_date_id: item.row.id,
          occurrence: item.occurrence,
          couple_id: item.row.couple_id,
        },
      })
      results.push({
        special_date_id: item.row.id,
        occurrence: item.occurrence,
        recipient: recipient.id,
        ...outcome,
      })
    }
  }

  return json({ ok: true, today, due: due.length, results })
})

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
      return { skipped: 'deduped' }
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

  return { sent: true, pushJson }
}

function utcDateString(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function nextOccurrence(
  month: number,
  day: number,
  fromDate: string,
): string | null {
  const [y, m, d] = fromDate.split('-').map(Number)
  const daysInMonth = (year: number, monthNum: number) =>
    new Date(Date.UTC(year, monthNum, 0)).getUTCDate()

  const tryYear = (year: number): string | null => {
    const maxDay = daysInMonth(year, month)
    if (day > maxDay) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const thisYear = tryYear(y)
  if (thisYear) {
    if (month > m || (month === m && day >= d)) return thisYear
  }
  return tryYear(y + 1)
}

function daysUntil(isoDate: string, fromDate: string): number {
  const [y1, m1, d1] = fromDate.split('-').map(Number)
  const [y2, m2, d2] = isoDate.split('-').map(Number)
  const a = Date.UTC(y1, m1 - 1, d1)
  const b = Date.UTC(y2, m2 - 1, d2)
  return Math.round((b - a) / 86_400_000)
}

function specialDateTitle(kind: string, label: string): string {
  const trimmed = label.trim()
  if (trimmed) return trimmed
  if (kind === 'anniversary') return 'Anniversary'
  if (kind === 'birthday') return 'Birthday'
  return 'Special date'
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
