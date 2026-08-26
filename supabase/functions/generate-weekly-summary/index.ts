import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

type CheckInRow = {
  check_in_date: string
  user_id: string
  score: number
  note: string | null
  activities: string[] | null
}

type ReviewRow = {
  user_id: string
  answers: unknown
}

type Body = {
  week_start?: string
  week_end?: string
  force?: boolean
}

const SCORE_LABELS: Record<number, string> = {
  1: 'Distant',
  2: 'A little disconnected',
  3: 'Neutral',
  4: 'Connected',
  5: 'Very connected',
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SECRET_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'Missing Supabase env' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing Authorization' }, 401)

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const admin = createClient(supabaseUrl, serviceKey)

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()
  if (userError || !user) return json({ error: 'Unauthorized' }, 401)

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const weekStart = body.week_start
  const weekEnd = body.week_end
  if (!weekStart || !weekEnd) {
    return json({ error: 'week_start and week_end are required' }, 400)
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, display_name, couple_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile?.couple_id) {
    return json({ error: 'You must be paired' }, 403)
  }

  const coupleId = profile.couple_id as string

  if (!body.force) {
    const { data: existing } = await admin
      .from('weekly_ai_summaries')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('week_start', weekStart)
      .maybeSingle()
    if (existing?.summary && !existing.dismissed_at) {
      return json({
        summary: existing.summary,
        source: existing.source,
        model: existing.model,
        cached: true,
      })
    }
  }

  const { data: partners } = await admin
    .from('profiles')
    .select('id, display_name')
    .eq('couple_id', coupleId)

  const me = partners?.find((p) => p.id === user.id)
  const partner = partners?.find((p) => p.id !== user.id)
  const myName = me?.display_name ?? 'You'
  const partnerName = partner?.display_name ?? 'Partner'

  const { data: checkIns, error: checkInError } = await admin
    .from('daily_check_ins')
    .select('check_in_date, user_id, score, note, activities')
    .eq('couple_id', coupleId)
    .gte('check_in_date', weekStart)
    .lte('check_in_date', weekEnd)
    .order('check_in_date', { ascending: true })

  if (checkInError) return json({ error: checkInError.message }, 500)

  const { data: reviews } = await admin
    .from('weekly_reviews')
    .select('user_id, answers')
    .eq('couple_id', coupleId)
    .eq('week_start', weekStart)

  const byDate = new Map<
    string,
    { mine?: CheckInRow; partner?: CheckInRow }
  >()
  for (const row of (checkIns ?? []) as CheckInRow[]) {
    const slot = byDate.get(row.check_in_date) ?? {}
    if (row.user_id === user.id) slot.mine = row
    else slot.partner = row
    byDate.set(row.check_in_date, slot)
  }

  const dayLines: string[] = []
  const dates = [...byDate.keys()].sort()
  // Ensure all 7 days appear even if empty
  const allDates = enumerateDates(weekStart, weekEnd)
  for (const date of allDates) {
    const slot = byDate.get(date) ?? {}
    const revealed = Boolean(slot.mine && slot.partner)
    const parts: string[] = [`${date}:`]
    if (slot.mine) {
      parts.push(
        `${myName} score ${slot.mine.score}/5 (${SCORE_LABELS[slot.mine.score] ?? ''})` +
          formatActivities(slot.mine.activities) +
          formatNote(slot.mine.note, 'note'),
      )
    } else {
      parts.push(`${myName} did not check in`)
    }
    if (revealed && slot.partner) {
      parts.push(
        `${partnerName} score ${slot.partner.score}/5 (${SCORE_LABELS[slot.partner.score] ?? ''})` +
          formatActivities(slot.partner.activities) +
          formatNote(slot.partner.note, 'note'),
      )
    } else if (slot.mine && !revealed) {
      parts.push(`${partnerName} hidden until both checked in`)
    } else if (slot.partner && !slot.mine) {
      parts.push(`${partnerName} checked in (details hidden until you do)`)
    }
    dayLines.push(parts.join(' | '))
  }

  const bothReviews =
    Boolean(reviews?.length === 2) ||
    Boolean(
      reviews?.some((r) => r.user_id === user.id) &&
        reviews?.some((r) => r.user_id !== user.id),
    )

  let reflectionBlock = ''
  if (bothReviews && reviews) {
    reflectionBlock = '\nWeekly reflection answers (both partners):\n'
    for (const review of reviews as ReviewRow[]) {
      const name =
        review.user_id === user.id ? myName : partnerName
      const answers = Array.isArray(review.answers) ? review.answers : []
      reflectionBlock += `${name}:\n`
      for (const raw of answers) {
        const a = raw as Record<string, unknown>
        reflectionBlock += `- ${String(a.prompt_text ?? '')}: ${String(a.answer ?? '')}\n`
      }
    }
  }

  const prompt = `You are Bond. Write a short suggested reading of a couple's week (3–5 short paragraphs).
Rules:
- This is a suggestion for conversation, never a diagnosis, never a verdict about whether the relationship is healthy or unhealthy.
- Do not blame either person or claim certainty about anyone's intent.
- Do not rank the partners or compare them as winning or losing the week.
- Prefer quoting their original words over interpreting them.
- Mention participation (days they showed up) separately from how the days felt.
- If weekly reflection answers are present, keep those words visible and do not replace them.
- Avoid medical or clinical language.

Couple: ${myName} & ${partnerName}
Week: ${weekStart} to ${weekEnd}

Daily check-ins (connection labels, not scores against each other):
${dayLines.join('\n') || 'No check-ins this week.'}
${reflectionBlock}`

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  let summary: string
  let source: 'ai' | 'fallback' = 'fallback'
  let model: string | null = null

  if (openaiKey) {
    try {
      const ai = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.6,
          messages: [
            {
              role: 'system',
              content:
                'You write optional weekly readings for couples. Never diagnose, blame, or rank partners. Quote their words. Label uncertainty.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      })
      if (ai.ok) {
        const payload = await ai.json()
        const text = payload?.choices?.[0]?.message?.content?.trim()
        if (text) {
          summary = text
          source = 'ai'
          model = 'gpt-4o-mini'
        } else {
          summary = buildFallback(dayLines, weekStart, weekEnd, partnerName)
        }
      } else {
        summary = buildFallback(dayLines, weekStart, weekEnd, partnerName)
      }
    } catch {
      summary = buildFallback(dayLines, weekStart, weekEnd, partnerName)
    }
  } else {
    summary = buildFallback(dayLines, weekStart, weekEnd, partnerName)
  }

  const { error: upsertError } = await admin.from('weekly_ai_summaries').upsert(
    {
      couple_id: coupleId,
      week_start: weekStart,
      week_end: weekEnd,
      summary,
      original_summary: summary,
      source,
      model,
      dismissed_at: null,
      dismissed_by: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'couple_id,week_start' },
  )

  if (upsertError) return json({ error: upsertError.message }, 500)

  return json({ summary, source, model, cached: false })
})

function enumerateDates(start: string, end: string): string[] {
  const out: string[] = []
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const cursor = new Date(sy, sm - 1, sd)
  const last = new Date(ey, em - 1, ed)
  while (cursor <= last) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${d}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

function formatActivities(activities: string[] | null): string {
  if (!activities?.length) return ''
  return `; activities: ${activities.join(', ')}`
}

function formatNote(note: string | null, label: string): string {
  const trimmed = note?.trim()
  if (!trimmed) return ''
  return `; ${label}: "${trimmed}"`
}

function buildFallback(
  dayLines: string[],
  weekStart: string,
  weekEnd: string,
  partnerName: string,
): string {
  return [
    `A suggested reading of ${weekStart} – ${weekEnd}. Not a verdict.`,
    'Here is what you wrote and how you showed up:',
    ...dayLines.map((line) => `• ${line}`),
    `This is for conversation with ${partnerName}, not a diagnosis.`,
  ].join('\n')
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
