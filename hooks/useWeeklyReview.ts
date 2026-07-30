import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../lib/auth'
import { addDays, localDateString } from '../lib/dates'
import { supabase } from '../lib/supabase'
import {
  promptsForWeek,
  summarizeScores,
  type WeeklyAnswer,
} from '../lib/weeklyPrompts'
import type { DailyCheckIn } from '../types/database'
import { computeStreak, useCheckInHistory } from './useCheckIn'

export type WeeklyReviewRow = {
  id: string
  couple_id: string
  user_id: string
  week_start: string
  week_end: string
  answers: WeeklyAnswer[]
  created_at: string
}

function parseAnswers(raw: unknown): WeeklyAnswer[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const row = item as Record<string, unknown>
    return {
      prompt_id: String(row.prompt_id ?? ''),
      prompt_text: String(row.prompt_text ?? ''),
      answer: String(row.answer ?? ''),
    }
  })
}

export function useWeeklyReview() {
  const { user, profile, partner } = useAuth()
  const { days, isLoading: historyLoading, refresh: refreshHistory } =
    useCheckInHistory()
  const [mine, setMine] = useState<WeeklyReviewRow | null>(null)
  const [partnerReview, setPartnerReview] = useState<WeeklyReviewRow | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = localDateString()
  const myDates = useMemo(
    () => days.filter((d) => d.mine).map((d) => d.date),
    [days],
  )
  const streak = useMemo(
    () => computeStreak(myDates, today),
    [myDates, today],
  )

  const completedBlocks = Math.floor(streak / 7)
  const daysIntoCurrentBlock = streak % 7
  const weekEnd =
    completedBlocks === 0
      ? today
      : daysIntoCurrentBlock === 0
        ? today
        : addDays(today, -daysIntoCurrentBlock)
  const weekStart = addDays(weekEnd, -6)
  const unlocked = completedBlocks >= 1

  const prompts = useMemo(() => {
    if (!profile?.couple_id) return []
    return promptsForWeek(profile.couple_id, weekStart)
  }, [profile?.couple_id, weekStart])

  const weekCheckIns = useMemo(() => {
    const keys = new Set(
      Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    )
    return days.filter((d) => keys.has(d.date))
  }, [days, weekStart])

  const myWeekScores = weekCheckIns
    .map((d) => d.mine?.score)
    .filter((s): s is number => typeof s === 'number')
  const partnerWeekScores = weekCheckIns
    .filter((d) => d.revealed && d.partner)
    .map((d) => d.partner!.score)

  const mySummary = summarizeScores(myWeekScores)
  const partnerSummary = summarizeScores(partnerWeekScores)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id || !unlocked) {
      setMine(null)
      setPartnerReview(null)
      setIsLoading(false)
      return
    }

    setError(null)
    const { data, error: fetchError } = await supabase
      .from('weekly_reviews')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .eq('week_start', weekStart)

    if (fetchError) {
      setError(fetchError.message)
      setIsLoading(false)
      return
    }

    const rows = (data ?? []).map((row) => ({
      ...row,
      answers: parseAnswers(row.answers),
    })) as WeeklyReviewRow[]

    setMine(rows.find((r) => r.user_id === user.id) ?? null)
    setPartnerReview(rows.find((r) => r.user_id !== user.id) ?? null)
    setIsLoading(false)
  }, [profile?.couple_id, unlocked, user?.id, weekStart])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  const submit = useCallback(
    async (answers: WeeklyAnswer[]) => {
      if (!user?.id || !profile?.couple_id) {
        return { error: 'You must be paired' }
      }
      if (answers.some((a) => a.answer.trim().length === 0)) {
        return { error: 'Please answer every prompt' }
      }

      const { error: insertError } = await supabase.from('weekly_reviews').insert({
        couple_id: profile.couple_id,
        user_id: user.id,
        week_start: weekStart,
        week_end: weekEnd,
        answers,
      })

      if (insertError) return { error: insertError.message }
      await refresh()
      return { error: null }
    },
    [profile?.couple_id, refresh, user?.id, weekEnd, weekStart],
  )

  const bothSubmitted = Boolean(mine && partner && partnerReview)
  const waitingForPartner = Boolean(mine && partner && !partnerReview)
  const needsReview = Boolean(unlocked && partner && !mine)

  return {
    streak,
    unlocked,
    needsReview,
    weekStart,
    weekEnd,
    prompts,
    mine,
    partnerReview,
    bothSubmitted,
    waitingForPartner,
    mySummary,
    partnerSummary,
    weekCheckIns,
    isLoading: isLoading || historyLoading,
    error,
    refresh: async () => {
      await refreshHistory()
      await refresh()
    },
    submit,
  }
}

export type DayDetail = {
  date: string
  mine: DailyCheckIn | null
  partner: DailyCheckIn | null
  revealed: boolean
}

export function useDayDetail(date: string) {
  const { user, profile } = useAuth()
  const [detail, setDetail] = useState<DayDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id || !date) {
      setDetail(null)
      setIsLoading(false)
      return
    }

    setError(null)
    const { data, error: fetchError } = await supabase
      .from('daily_check_ins')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .eq('check_in_date', date)

    if (fetchError) {
      setError(fetchError.message)
      setIsLoading(false)
      return
    }

    const rows = data ?? []
    const mine = rows.find((r) => r.user_id === user.id) ?? null
    const partnerRow = rows.find((r) => r.user_id !== user.id) ?? null
    setDetail({
      date,
      mine,
      partner: partnerRow,
      revealed: Boolean(mine && partnerRow),
    })
    setIsLoading(false)
  }, [date, profile?.couple_id, user?.id])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  return { detail, isLoading, error, refresh }
}
