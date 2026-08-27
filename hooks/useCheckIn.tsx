import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AppState } from 'react-native'

import { useAuth } from '../lib/auth'
import {
  clearCheckInDraft,
} from '../lib/checkInDraft'
import {
  clearQueuedCheckIn,
  enqueueCheckIn,
  listQueuedCheckIns,
  type CheckInOutboxEntry,
} from '../lib/checkInOutbox'
import { reportError } from '../lib/monitor'
import { localDateString, startOfMonth, endOfMonth } from '../lib/dates'
import { isOnlineNow, useOnline } from '../lib/network'
import { describeRhythm } from '../lib/rhythm'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import type { DailyCheckIn } from '../types/database'

export const OPENED_WHILE_EDITING =
  'Today opened while you were editing.'

export type HistoryDay = {
  date: string
  mine: DailyCheckIn | null
  partner: DailyCheckIn | null
  revealed: boolean
}

export type MonthDayData = HistoryDay

type SubmitPrompt = {
  id: string
  text: string
  answer: string
}

export type CheckInIndexDay = {
  date: string
  mineScore: number | null
  partnerScore: number | null
  revealed: boolean
  activities: string[]
}

export type CheckInGrowth = {
  myCheckIns: number
  revealedDays: number
  lastDate: string | null
}

type CheckInContextValue = {
  days: HistoryDay[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  submit: (
    score: number,
    note: string,
    activities?: string[],
    prompt?: SubmitPrompt,
  ) => Promise<{ error: string | null; queued?: boolean }>
  revise: (
    score: number,
    note: string,
    activities?: string[],
    prompt?: SubmitPrompt,
  ) => Promise<{ error: string | null; opened?: boolean }>
  sendNudge: () => Promise<{ error: string | null }>
}

const CheckInContext = createContext<CheckInContextValue | undefined>(
  undefined,
)

function groupDays(rows: DailyCheckIn[], userId: string): HistoryDay[] {
  const byDate = new Map<string, HistoryDay>()
  for (const row of rows) {
    const existing = byDate.get(row.check_in_date) ?? {
      date: row.check_in_date,
      mine: null,
      partner: null,
      revealed: false,
    }
    if (row.user_id === userId) existing.mine = row
    else existing.partner = row
    byDate.set(row.check_in_date, existing)
  }
  for (const day of byDate.values()) {
    // RLS should already hide a partner row until both have submitted.
    // Drop it anyway if ours is missing so the UI cannot leak it.
    if (!day.mine) day.partner = null
    day.revealed = Boolean(day.mine && day.partner)
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
}

function uniqueActivities(ids: string[] | null | undefined): string[] {
  if (!ids || ids.length === 0) return []
  return [...new Set(ids)].sort()
}

function groupIndex(
  rows: {
    check_in_date: string
    user_id: string
    score: number
    activities: string[] | null
  }[],
  userId: string,
): CheckInIndexDay[] {
  const byDate = new Map<
    string,
    CheckInIndexDay & { mineActivities: string[]; partnerActivities: string[] }
  >()
  for (const row of rows) {
    const existing = byDate.get(row.check_in_date) ?? {
      date: row.check_in_date,
      mineScore: null,
      partnerScore: null,
      revealed: false,
      activities: [],
      mineActivities: [],
      partnerActivities: [],
    }
    const tags = uniqueActivities(row.activities)
    if (row.user_id === userId) {
      existing.mineScore = row.score
      existing.mineActivities = tags
    } else {
      existing.partnerScore = row.score
      existing.partnerActivities = tags
    }
    byDate.set(row.check_in_date, existing)
  }
  const days: CheckInIndexDay[] = []
  for (const day of byDate.values()) {
    if (day.mineScore == null) {
      day.partnerScore = null
      day.partnerActivities = []
    }
    day.revealed = day.mineScore != null && day.partnerScore != null
    day.activities = uniqueActivities([
      ...day.mineActivities,
      ...(day.revealed ? day.partnerActivities : []),
    ])
    days.push({
      date: day.date,
      mineScore: day.mineScore,
      partnerScore: day.partnerScore,
      revealed: day.revealed,
      activities: day.activities,
    })
  }
  return days.sort((a, b) => b.date.localeCompare(a.date))
}

async function fetchCheckInRange(
  coupleId: string,
  userId: string,
  from: string,
  to: string,
): Promise<{ days: HistoryDay[]; error: string | null }> {
  const { data, error: fetchError } = await supabase
    .from('daily_check_ins')
    .select('*')
    .eq('couple_id', coupleId)
    .gte('check_in_date', from)
    .lte('check_in_date', to)
    .order('check_in_date', { ascending: false })

  if (fetchError) {
    reportError('supabase', fetchError.message, { op: 'check-ins-range' })
    return { days: [], error: fetchError.message }
  }
  return { days: groupDays(data ?? [], userId), error: null }
}

type CheckInWrite = {
  couple_id: string
  user_id: string
  check_in_date: string
  score: number
  note: string | null
  activities: string[]
  prompt_id: string | null
  prompt_text: string | null
  prompt_answer: string | null
}

function isNetworkFailure(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    !isOnlineNow() ||
    lower.includes('failed to fetch') ||
    lower.includes('network request failed') ||
    lower.includes('network error') ||
    lower.includes('offline')
  )
}

async function writeCheckIn(payload: CheckInWrite): Promise<{
  ok: boolean
  duplicate: boolean
  network: boolean
  error: string | null
}> {
  const { error: insertError } = await supabase
    .from('daily_check_ins')
    .insert(payload)

  if (!insertError) return { ok: true, duplicate: false, network: false, error: null }

  const missingPromptColumns =
    insertError.message.includes('prompt_id') ||
    insertError.message.includes('prompt_text') ||
    insertError.message.includes('prompt_answer') ||
    insertError.code === 'PGRST204'

  if (missingPromptColumns) {
    const fallbackNote = [payload.prompt_text, payload.prompt_answer, payload.note]
      .filter((part) => part && part.length > 0)
      .join('\n\n')
    const { error: retryError } = await supabase.from('daily_check_ins').insert({
      couple_id: payload.couple_id,
      user_id: payload.user_id,
      check_in_date: payload.check_in_date,
      score: payload.score,
      note: fallbackNote.length > 0 ? fallbackNote : null,
      activities: payload.activities,
    })
    if (!retryError) {
      return { ok: true, duplicate: false, network: false, error: null }
    }
    if (retryError.code === '23505') {
      return { ok: true, duplicate: true, network: false, error: null }
    }
    return {
      ok: false,
      duplicate: false,
      network: isNetworkFailure(retryError.message),
      error: retryError.message,
    }
  }

  if (insertError.code === '23505') {
    return { ok: true, duplicate: true, network: false, error: null }
  }

  return {
    ok: false,
    duplicate: false,
    network: isNetworkFailure(insertError.message),
    error: insertError.message,
  }
}

async function writeCheckInRevision(
  id: string,
  userId: string,
  payload: Omit<CheckInWrite, 'couple_id' | 'user_id' | 'check_in_date'>,
): Promise<{
  ok: boolean
  opened: boolean
  network: boolean
  error: string | null
}> {
  const patch = {
    score: payload.score,
    note: payload.note,
    activities: payload.activities,
    prompt_id: payload.prompt_id,
    prompt_text: payload.prompt_text,
    prompt_answer: payload.prompt_answer,
  }

  const { data, error } = await supabase
    .from('daily_check_ins')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')

  if (!error && (data?.length ?? 0) > 0) {
    return { ok: true, opened: false, network: false, error: null }
  }

  const message = error?.message ?? ''
  if (error && isNetworkFailure(message)) {
    return { ok: false, opened: false, network: true, error: message }
  }

  const missingPromptColumns =
    Boolean(error) &&
    (message.includes('prompt_id') ||
      message.includes('prompt_text') ||
      message.includes('prompt_answer') ||
      error?.code === 'PGRST204')

  if (missingPromptColumns) {
    const fallbackNote = [payload.prompt_text, payload.prompt_answer, payload.note]
      .filter((part) => part && part.length > 0)
      .join('\n\n')
    const retry = await supabase
      .from('daily_check_ins')
      .update({
        score: payload.score,
        note: fallbackNote.length > 0 ? fallbackNote : null,
        activities: payload.activities,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
    if (!retry.error && (retry.data?.length ?? 0) > 0) {
      return { ok: true, opened: false, network: false, error: null }
    }
    if (retry.error && isNetworkFailure(retry.error.message)) {
      return {
        ok: false,
        opened: false,
        network: true,
        error: retry.error.message,
      }
    }
  }

  const opened =
    !error ||
    error.code === 'P0001' ||
    message.toLowerCase().includes('already opened')

  return {
    ok: false,
    opened,
    network: false,
    error: message || 'Could not save that correction.',
  }
}

function payloadFromOutbox(entry: CheckInOutboxEntry): CheckInWrite {
  return {
    couple_id: entry.coupleId,
    user_id: entry.userId,
    check_in_date: entry.date,
    score: entry.score,
    note: entry.note,
    activities: entry.activities,
    prompt_id: entry.prompt_id,
    prompt_text: entry.prompt_text,
    prompt_answer: entry.prompt_answer,
  }
}

export function CheckInProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const online = useOnline()
  const { showToast } = useToast()
  const [days, setDays] = useState<HistoryDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      setDays([])
      setIsLoading(false)
      return
    }

    setError(null)
    const today = localDateString()
    const { data, error: fetchError } = await supabase
      .from('daily_check_ins')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .eq('check_in_date', today)
      .order('created_at', { ascending: true })

    if (fetchError) {
      reportError('supabase', fetchError.message, { op: 'check-ins' })
      setError(fetchError.message)
      setIsLoading(false)
      return
    }

    setDays(groupDays(data ?? [], user.id))
    setIsLoading(false)
  }, [profile?.couple_id, user?.id])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!user?.id || !profile?.couple_id) return

    const channel = supabase
      .channel(
        `daily_check_ins:${profile.couple_id}:${Math.random().toString(36).slice(2)}`,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'daily_check_ins',
          filter: `couple_id=eq.${profile.couple_id}`,
        },
        () => {
          void refresh()
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'daily_check_ins',
          filter: `couple_id=eq.${profile.couple_id}`,
        },
        () => {
          void refresh()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [profile?.couple_id, refresh, user?.id])

  const submit = useCallback(
    async (
      score: number,
      note: string,
      activities: string[] = [],
      prompt?: SubmitPrompt,
    ) => {
      if (!user?.id || !profile?.couple_id) {
        return { error: 'You must be paired to check in' }
      }
      const coupleId = profile.couple_id
      const userId = user.id
      if (score < 1 || score > 5) {
        return { error: 'Choose a score from 1 to 5' }
      }
      if (activities.length > 5) {
        return { error: 'Pick up to 5 activity tags' }
      }

      const today = days.find((day) => day.date === localDateString())
      if (today?.mine) {
        await clearQueuedCheckIn(userId, localDateString())
        return { error: null }
      }

      const trimmed = note.trim()
      const promptAnswer = prompt?.answer.trim() ?? ''
      const date = localDateString()
      const payload: CheckInWrite = {
        couple_id: coupleId,
        user_id: userId,
        check_in_date: date,
        score,
        note: trimmed.length > 0 ? trimmed : null,
        activities,
        prompt_id: prompt?.id ?? null,
        prompt_text: prompt?.text ?? null,
        prompt_answer: promptAnswer.length > 0 ? promptAnswer : null,
      }

      const queue = async () => {
        await enqueueCheckIn({
          userId,
          coupleId,
          date,
          score: payload.score,
          note: payload.note,
          activities: payload.activities,
          prompt_id: payload.prompt_id,
          prompt_text: payload.prompt_text,
          prompt_answer: payload.prompt_answer,
          queuedAt: new Date().toISOString(),
        })
        return { error: null, queued: true as const }
      }

      if (!isOnlineNow()) return queue()

      const result = await writeCheckIn(payload)
      if (result.ok) {
        await clearQueuedCheckIn(userId, date)
        await clearCheckInDraft(userId, date)
        await refresh()
        return { error: null }
      }
      if (result.network) return queue()

      reportError('supabase', result.error, { op: 'check-in-save' })
      return { error: result.error }
    },
    [days, profile?.couple_id, refresh, user?.id],
  )

  const revise = useCallback(
    async (
      score: number,
      note: string,
      activities: string[] = [],
      prompt?: SubmitPrompt,
    ) => {
      if (!user?.id || !profile?.couple_id) {
        return { error: 'You must be paired to check in' }
      }
      const coupleId = profile.couple_id
      const userId = user.id
      if (score < 1 || score > 5) {
        return { error: 'Choose a score from 1 to 5' }
      }
      if (activities.length > 5) {
        return { error: 'Pick up to 5 activity tags' }
      }

      const date = localDateString()
      const today = days.find((day) => day.date === date)
      if (!today?.mine) {
        return { error: 'Nothing to correct yet' }
      }
      if (today.revealed) {
        return { error: null, opened: true }
      }
      if (!isOnlineNow()) {
        return {
          error:
            'Reconnect to save this correction. Today is not updated until Bond confirms it.',
        }
      }

      const trimmed = note.trim()
      const promptAnswer = prompt?.answer.trim() ?? ''
      const result = await writeCheckInRevision(today.mine.id, userId, {
        score,
        note: trimmed.length > 0 ? trimmed : null,
        activities,
        prompt_id: prompt?.id ?? null,
        prompt_text: prompt?.text ?? null,
        prompt_answer: promptAnswer.length > 0 ? promptAnswer : null,
      })

      if (result.ok) {
        await refresh()
        return { error: null }
      }

      const { data: rows } = await supabase
        .from('daily_check_ins')
        .select('user_id')
        .eq('couple_id', coupleId)
        .eq('check_in_date', date)
      const opened = (rows ?? []).some((row) => row.user_id !== userId)
      await refresh()
      if (opened || result.opened) {
        return { error: null, opened: true }
      }
      if (result.network) {
        return {
          error:
            'Reconnect to save this correction. Today is not updated until Bond confirms it.',
        }
      }
      reportError('supabase', result.error, { op: 'check-in-revise' })
      return { error: result.error }
    },
    [days, profile?.couple_id, refresh, user?.id],
  )

  const flushOutbox = useCallback(async () => {
    if (!user?.id || !profile?.couple_id || !isOnlineNow()) return
    const pending = await listQueuedCheckIns(user.id)
    let sent = 0
    for (const entry of pending) {
      if (entry.coupleId !== profile.couple_id) continue
      const result = await writeCheckIn(payloadFromOutbox(entry))
      if (result.ok) {
        await clearQueuedCheckIn(entry.userId, entry.date)
        await clearCheckInDraft(entry.userId, entry.date)
        sent += 1
        continue
      }
      if (result.network) return
      reportError('supabase', result.error, { op: 'check-in-flush' })
    }
    if (sent > 0) {
      await refresh()
      showToast('Saved. Private until they check in too.')
    }
  }, [profile?.couple_id, refresh, showToast, user?.id])

  useEffect(() => {
    if (!online) return
    void flushOutbox()
  }, [flushOutbox, online])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh()
        void flushOutbox()
      }
    })
    return () => sub.remove()
  }, [flushOutbox, refresh])

  const sendNudge = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      return { error: 'You must be paired' }
    }
    const { error: insertError } = await supabase.from('partner_signals').insert({
      couple_id: profile.couple_id,
      actor_id: user.id,
      event_type: 'check_in_nudge',
      summary: 'saved today, whenever you have a minute',
    })
    if (insertError) {
      reportError('supabase', insertError.message, { op: 'check-in-nudge' })
      return { error: insertError.message }
    }
    return { error: null }
  }, [profile?.couple_id, user?.id])

  const value = useMemo(
    () => ({
      days,
      isLoading,
      error,
      refresh,
      submit,
      revise,
      sendNudge,
    }),
    [days, error, isLoading, refresh, revise, sendNudge, submit],
  )

  return (
    <CheckInContext.Provider value={value}>{children}</CheckInContext.Provider>
  )
}

function useCheckInContext(): CheckInContextValue {
  const ctx = useContext(CheckInContext)
  if (!ctx) {
    throw new Error('Check-in hooks must be used within CheckInProvider')
  }
  return ctx
}

export function useTodayCheckIn() {
  const { partner } = useAuth()
  const { days, isLoading, error, refresh, submit, revise, sendNudge } =
    useCheckInContext()
  const today = days.find((day) => day.date === localDateString())
  const mine = today?.mine ?? null
  const partnerCheckIn = today?.revealed ? today.partner : null

  return {
    mine,
    partnerCheckIn,
    bothSubmitted: Boolean(today?.revealed),
    waitingForPartner: Boolean(mine && partner && !today?.revealed),
    isLoading,
    error,
    refresh,
    submit,
    revise,
    sendNudge,
  }
}

export function useCheckInGrowth(): CheckInGrowth & {
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState<CheckInGrowth>({
    myCheckIns: 0,
    revealedDays: 0,
    lastDate: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      setStats({ myCheckIns: 0, revealedDays: 0, lastDate: null })
      setIsLoading(false)
      return
    }

    setError(null)
    const coupleId = profile.couple_id
    const userId = user.id
    const [mine, partner, last] = await Promise.all([
      supabase
        .from('daily_check_ins')
        .select('id', { count: 'exact', head: true })
        .eq('couple_id', coupleId)
        .eq('user_id', userId),
      supabase
        .from('daily_check_ins')
        .select('id', { count: 'exact', head: true })
        .eq('couple_id', coupleId)
        .neq('user_id', userId),
      supabase
        .from('daily_check_ins')
        .select('check_in_date')
        .eq('couple_id', coupleId)
        .eq('user_id', userId)
        .order('check_in_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const message = mine.error?.message ?? partner.error?.message ?? last.error?.message
    if (message) {
      reportError('supabase', message, { op: 'check-in-growth' })
      setError(message)
      setIsLoading(false)
      return
    }

    setStats({
      myCheckIns: mine.count ?? 0,
      revealedDays: partner.count ?? 0,
      lastDate: last.data?.check_in_date ?? null,
    })
    setIsLoading(false)
  }, [profile?.couple_id, user?.id])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  return { ...stats, isLoading, error, refresh }
}

export function useCheckInIndex() {
  const { user, profile } = useAuth()
  const [days, setDays] = useState<CheckInIndexDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      setDays([])
      setIsLoading(false)
      return
    }

    setError(null)
    const { data, error: fetchError } = await supabase
      .from('daily_check_ins')
      .select('check_in_date, user_id, score, activities')
      .eq('couple_id', profile.couple_id)
      .order('check_in_date', { ascending: false })

    if (fetchError) {
      reportError('supabase', fetchError.message, { op: 'check-in-index' })
      setError(fetchError.message)
      setIsLoading(false)
      return
    }

    setDays(groupIndex(data ?? [], user.id))
    setIsLoading(false)
  }, [profile?.couple_id, user?.id])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  return { days, isLoading, error, refresh }
}

const monthPageCache = new Map<string, HistoryDay[]>()

export function useMonthCheckIns(year: number, monthIndex: number) {
  const { user, profile } = useAuth()
  const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
  const [days, setDays] = useState<HistoryDay[]>(() => monthPageCache.get(key) ?? [])
  const [isLoading, setIsLoading] = useState(() => !monthPageCache.has(key))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      setDays([])
      setIsLoading(false)
      return
    }

    setError(null)
    const from = startOfMonth(year, monthIndex)
    const to = endOfMonth(year, monthIndex)
    const result = await fetchCheckInRange(profile.couple_id, user.id, from, to)
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }
    monthPageCache.set(key, result.days)
    setDays(result.days)
    setIsLoading(false)
  }, [key, monthIndex, profile?.couple_id, user?.id, year])

  useEffect(() => {
    const cached = monthPageCache.get(key)
    if (cached) {
      setDays(cached)
      setIsLoading(false)
    } else {
      setDays([])
      setIsLoading(true)
    }
    void refresh()
  }, [key, refresh])

  const byDate = useMemo(() => {
    const map: Record<string, MonthDayData> = {}
    for (const day of days) map[day.date] = day
    return map
  }, [days])

  return { days, byDate, isLoading, error, refresh }
}

export function useCheckInRange(from: string, to: string) {
  const { user, profile } = useAuth()
  const [days, setDays] = useState<HistoryDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      setDays([])
      setIsLoading(false)
      return
    }
    setError(null)
    const result = await fetchCheckInRange(profile.couple_id, user.id, from, to)
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }
    setDays(result.days)
    setIsLoading(false)
  }, [from, profile?.couple_id, to, user?.id])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  return { days, isLoading, error, refresh }
}

export function useDayDetail(date: string) {
  const { user, profile } = useAuth()
  const {
    days: todayDays,
    isLoading: todayLoading,
    error: todayError,
    refresh: refreshToday,
  } = useCheckInContext()
  const isToday = date === localDateString()
  const [past, setPast] = useState<HistoryDay | null>(null)
  const [pastLoading, setPastLoading] = useState(!isToday)
  const [pastError, setPastError] = useState<string | null>(null)

  const refreshPast = useCallback(async () => {
    if (!date || isToday || !user?.id || !profile?.couple_id) {
      setPast(null)
      setPastLoading(false)
      return
    }
    setPastError(null)
    const result = await fetchCheckInRange(profile.couple_id, user.id, date, date)
    if (result.error) {
      setPastError(result.error)
      setPastLoading(false)
      return
    }
    setPast(result.days[0] ?? null)
    setPastLoading(false)
  }, [date, isToday, profile?.couple_id, user?.id])

  useEffect(() => {
    if (isToday) {
      setPastLoading(false)
      return
    }
    setPastLoading(true)
    void refreshPast()
  }, [isToday, refreshPast])

  const todayRow = todayDays.find((row) => row.date === date)
  const day = isToday ? (todayRow ?? null) : past
  const detail = {
    date,
    mine: day?.mine ?? null,
    partner: day?.revealed ? (day.partner ?? null) : null,
    revealed: Boolean(day?.revealed),
  }

  return {
    detail,
    isLoading: isToday ? todayLoading : pastLoading,
    error: isToday ? todayError : pastError,
    refresh: isToday ? refreshToday : refreshPast,
  }
}

export function computeStreak(myDates: string[], today: string): number {
  return describeRhythm(myDates, [], today).stretch
}
