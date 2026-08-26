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
import { reportError } from '../lib/monitor'
import { localDateString } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { DailyCheckIn } from '../types/database'

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
  ) => Promise<{ error: string | null }>
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

export function CheckInProvider({ children }: { children: ReactNode }) {
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
    const { data, error: fetchError } = await supabase
      .from('daily_check_ins')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('check_in_date', { ascending: false })
      .limit(400)

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
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh()
    })
    return () => sub.remove()
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
      if (score < 1 || score > 5) {
        return { error: 'Choose a score from 1 to 5' }
      }
      if (activities.length > 5) {
        return { error: 'Pick up to 5 activity tags' }
      }

      const today = days.find((day) => day.date === localDateString())
      if (today?.mine) {
        return { error: null }
      }

      const trimmed = note.trim()
      const promptAnswer = prompt?.answer.trim() ?? ''
      const payload = {
        couple_id: profile.couple_id,
        user_id: user.id,
        check_in_date: localDateString(),
        score,
        note: trimmed.length > 0 ? trimmed : null,
        activities,
        prompt_id: prompt?.id ?? null,
        prompt_text: prompt?.text ?? null,
        prompt_answer: promptAnswer.length > 0 ? promptAnswer : null,
      }

      const { error: insertError } = await supabase
        .from('daily_check_ins')
        .insert(payload)

      if (insertError) {
        const missingPromptColumns =
          insertError.message.includes('prompt_id') ||
          insertError.message.includes('prompt_text') ||
          insertError.message.includes('prompt_answer') ||
          insertError.code === 'PGRST204'

        if (missingPromptColumns) {
          const fallbackNote = [prompt?.text, promptAnswer, trimmed]
            .filter((part) => part && part.length > 0)
            .join('\n\n')
          const { error: retryError } = await supabase
            .from('daily_check_ins')
            .insert({
              couple_id: profile.couple_id,
              user_id: user.id,
              check_in_date: localDateString(),
              score,
              note: fallbackNote.length > 0 ? fallbackNote : null,
              activities,
            })
          if (retryError) return { error: retryError.message }
          await refresh()
          return { error: null }
        }

        if (insertError.code === '23505') {
          await refresh()
          return { error: null }
        }

        reportError('supabase', insertError.message, { op: 'check-in-save' })
        return { error: insertError.message }
      }

      await refresh()
      return { error: null }
    },
    [days, profile?.couple_id, refresh, user?.id],
  )

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
      sendNudge,
    }),
    [days, error, isLoading, refresh, sendNudge, submit],
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
  const { days, isLoading, error, refresh, submit, sendNudge } =
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
    sendNudge,
  }
}

export function useCheckInHistory() {
  const { days, isLoading, error, refresh } = useCheckInContext()
  return { days, isLoading, error, refresh }
}

export function useMonthCheckIns(year: number, monthIndex: number) {
  const { days, isLoading, error, refresh } = useCheckInContext()
  const byDate = useMemo(() => {
    const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`
    const map: Record<string, MonthDayData> = {}
    for (const day of days) {
      if (!day.date.startsWith(prefix)) continue
      map[day.date] = day
    }
    return map
  }, [days, monthIndex, year])

  return { byDate, isLoading, error, refresh }
}

export function useDayDetail(date: string) {
  const { days, isLoading, error, refresh } = useCheckInContext()
  const detail = useMemo(() => {
    const day = days.find((row) => row.date === date)
    return {
      date,
      mine: day?.mine ?? null,
      partner: day?.revealed ? (day.partner ?? null) : null,
      revealed: Boolean(day?.revealed),
    }
  }, [date, days])

  return { detail, isLoading, error, refresh }
}

export function computeStreak(myDates: string[], today: string): number {
  const set = new Set(myDates)
  let streak = 0
  let cursor = today
  while (set.has(cursor)) {
    streak += 1
    const [y, m, d] = cursor.split('-').map(Number)
    const prev = new Date(y, m - 1, d)
    prev.setDate(prev.getDate() - 1)
    cursor = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`
  }
  return streak
}
