import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../lib/auth'
import { localDateString, previousCompletedWeek } from '../lib/dates'
import { reportError } from '../lib/monitor'
import { isOnlineNow } from '../lib/network'
import { supabase } from '../lib/supabase'
import { clearWeeklyReviewDraft } from '../lib/weeklyReviewDraft'
import {
  promptsForWeek,
  summarizeScores,
  weeklyAnswerIsComplete,
  type WeeklyAnswer,
} from '../lib/weeklyPrompts'
import { buildCompletedReviewSummary, buildFallbackWeeklySummary } from '../lib/weeklyAiSummary'
import { useCheckInGrowth, useCheckInRange } from './useCheckIn'

export type WeeklyReviewRow = {
  id: string
  couple_id: string
  user_id: string
  week_start: string
  week_end: string
  answers: WeeklyAnswer[]
  created_at: string
}

export type WeeklyAiSummaryState = {
  summary: string
  source: 'ai' | 'fallback'
  model: string | null
  cached: boolean
  originalSummary: string | null
  dismissed: boolean
  personallyEdited: boolean
}

type SummaryPrefRow = {
  hidden: boolean
  edited_summary: string | null
}

function parseAnswers(raw: unknown): WeeklyAnswer[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const row = item as Record<string, unknown>
    return {
      prompt_id: String(row.prompt_id ?? ''),
      prompt_text: String(row.prompt_text ?? ''),
      answer: String(row.answer ?? ''),
      skipped: Boolean(row.skipped),
    }
  })
}

function overlaySummary(
  shared: {
    summary: string
    source: 'ai' | 'fallback'
    model: string | null
    cached: boolean
    originalSummary: string | null
  },
  pref: SummaryPrefRow | null,
): WeeklyAiSummaryState {
  const original = shared.originalSummary ?? shared.summary
  const edited = pref?.edited_summary?.trim() || null
  return {
    summary: edited ?? original,
    source: shared.source,
    model: shared.model,
    cached: shared.cached,
    originalSummary: original,
    dismissed: Boolean(pref?.hidden),
    personallyEdited: Boolean(edited),
  }
}

export function useWeeklyReview() {
  const { user, profile, partner } = useAuth()
  const {
    myCheckIns,
    isLoading: growthLoading,
    refresh: refreshGrowth,
  } = useCheckInGrowth()
  const [mine, setMine] = useState<WeeklyReviewRow | null>(null)
  const [partnerReview, setPartnerReview] = useState<WeeklyReviewRow | null>(
    null,
  )
  const [aiSummary, setAiSummary] = useState<WeeklyAiSummaryState | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = localDateString()
  const { weekStart, weekEnd } = previousCompletedWeek(today)
  const {
    days: weekDays,
    isLoading: weekLoading,
    refresh: refreshWeek,
  } = useCheckInRange(weekStart, weekEnd)
  const unlocked = myCheckIns >= 7

  const prompts = useMemo(() => {
    if (!profile?.couple_id) return []
    return promptsForWeek(profile.couple_id, weekStart)
  }, [profile?.couple_id, weekStart])

  const weekCheckIns = weekDays

  const myWeekScores = weekCheckIns
    .map((d) => d.mine?.score)
    .filter((s): s is number => typeof s === 'number')
  const partnerWeekScores = weekCheckIns
    .filter((d) => d.revealed && d.partner)
    .map((d) => d.partner!.score)

  const mySummary = summarizeScores(myWeekScores)
  const partnerSummary = summarizeScores(partnerWeekScores)

  const writePref = useCallback(
    async (patch: { hidden?: boolean; edited_summary?: string | null }) => {
      if (!user?.id || !profile?.couple_id) {
        return { error: 'You must be paired' }
      }
      const { data: existing } = await supabase
        .from('weekly_ai_summary_prefs')
        .select('hidden, edited_summary')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .maybeSingle()
      const { error: upsertError } = await supabase
        .from('weekly_ai_summary_prefs')
        .upsert(
          {
            user_id: user.id,
            couple_id: profile.couple_id,
            week_start: weekStart,
            hidden: patch.hidden ?? existing?.hidden ?? false,
            edited_summary:
              patch.edited_summary !== undefined
                ? patch.edited_summary
                : existing?.edited_summary ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,week_start' },
        )
      return { error: upsertError?.message ?? null }
    },
    [profile?.couple_id, user?.id, weekStart],
  )

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id || !unlocked) {
      setMine(null)
      setPartnerReview(null)
      setAiSummary(null)
      setIsLoading(false)
      return
    }

    setError(null)
    const [{ data, error: fetchError }, { data: summaryRow }, { data: prefRow }] =
      await Promise.all([
        supabase
          .from('weekly_reviews')
          .select('*')
          .eq('couple_id', profile.couple_id)
          .eq('week_start', weekStart),
        supabase
          .from('weekly_ai_summaries')
          .select('summary, source, model, original_summary')
          .eq('couple_id', profile.couple_id)
          .eq('week_start', weekStart)
          .maybeSingle(),
        supabase
          .from('weekly_ai_summary_prefs')
          .select('hidden, edited_summary')
          .eq('user_id', user.id)
          .eq('week_start', weekStart)
          .maybeSingle(),
      ])

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
    if (summaryRow?.summary) {
      setAiSummary(
        overlaySummary(
          {
            summary: summaryRow.summary,
            source: (summaryRow.source as 'ai' | 'fallback') ?? 'fallback',
            model: summaryRow.model ?? null,
            cached: true,
            originalSummary: summaryRow.original_summary ?? summaryRow.summary,
          },
          prefRow,
        ),
      )
    } else {
      setAiSummary(null)
    }
    setIsLoading(false)
  }, [profile?.couple_id, unlocked, user?.id, weekStart])

  const generateAiSummary = useCallback(
    async (force = false) => {
      if (!user?.id || !profile?.couple_id || !unlocked) {
        return { error: 'Weekly review is locked' }
      }

      setAiLoading(true)
      setAiError(null)

      const { data, error: fnError } = await supabase.functions.invoke(
        'generate-weekly-summary',
        {
          body: {
            week_start: weekStart,
            week_end: weekEnd,
            force,
          },
        },
      )

      const applyShared = async (shared: {
        summary: string
        source: 'ai' | 'fallback'
        model: string | null
        cached: boolean
      }) => {
        await writePref({ edited_summary: null })
        setAiSummary((current) =>
          overlaySummary(
            {
              ...shared,
              originalSummary: shared.summary,
            },
            {
              hidden: current?.dismissed ?? false,
              edited_summary: null,
            },
          ),
        )
      }

      if (fnError) {
        const fallback = buildFallbackWeeklySummary({
          weekStart,
          weekEnd,
          partnerName: partner?.display_name ?? 'Partner',
          days: weekCheckIns.map((d) => ({
            date: d.date,
            mine: d.mine
              ? {
                  score: d.mine.score,
                  note: d.mine.note,
                  activities: d.mine.activities,
                  prompt_answer: d.mine.prompt_answer,
                }
              : null,
            partner: d.partner
              ? {
                  score: d.partner.score,
                  note: d.partner.note,
                  activities: d.partner.activities,
                  prompt_answer: d.partner.prompt_answer,
                }
              : null,
            revealed: d.revealed,
          })),
          mineAnswers: mine?.answers,
          partnerAnswers: partnerReview?.answers,
        })
        await applyShared({
          summary: fallback,
          source: 'fallback',
          model: null,
          cached: false,
        })
        await supabase.from('weekly_ai_summaries').upsert(
          {
            couple_id: profile.couple_id,
            week_start: weekStart,
            week_end: weekEnd,
            summary: fallback,
            original_summary: fallback,
            source: 'fallback',
            model: null,
          },
          { onConflict: 'couple_id,week_start' },
        )
        setAiError(fnError.message)
        setAiLoading(false)
        return { error: fnError.message }
      }

      const payload = data as {
        summary?: string
        source?: 'ai' | 'fallback'
        model?: string | null
        cached?: boolean
      } | null
      if (!payload?.summary) {
        setAiLoading(false)
        setAiError('No summary returned')
        return { error: 'No summary returned' }
      }

      await applyShared({
        summary: payload.summary,
        source: payload.source ?? 'ai',
        model: payload.model ?? null,
        cached: Boolean(payload.cached),
      })
      setAiLoading(false)
      return { error: null }
    },
    [
      partner?.display_name,
      profile?.couple_id,
      unlocked,
      user?.id,
      weekCheckIns,
      weekEnd,
      weekStart,
      mine?.answers,
      partnerReview?.answers,
      writePref,
    ],
  )

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  const submit = useCallback(
    async (answers: WeeklyAnswer[]) => {
      if (!user?.id || !profile?.couple_id) {
        return { error: 'You must be paired' }
      }
      if (mine) {
        return { error: null }
      }
      if (answers.some((a) => !weeklyAnswerIsComplete(a))) {
        return { error: 'Please answer or skip every prompt' }
      }
      if (!isOnlineNow()) {
        return {
          error:
            'Reconnect to submit. Last week is not in the relationship until Bond confirms it.',
        }
      }

      const { error: insertError } = await supabase.from('weekly_reviews').insert({
        couple_id: profile.couple_id,
        user_id: user.id,
        week_start: weekStart,
        week_end: weekEnd,
        answers,
      })

      if (insertError) {
        if (insertError.code === '23505') {
          await refresh()
          await clearWeeklyReviewDraft(user.id, weekStart)
          return { error: null }
        }
        reportError('supabase', insertError.message, { op: 'weekly-review' })
        return { error: insertError.message }
      }
      await clearWeeklyReviewDraft(user.id, weekStart)
      await refresh()
      return { error: null }
    },
    [mine, profile?.couple_id, refresh, user?.id, weekEnd, weekStart],
  )

  const saveEditedSummary = useCallback(
    async (text: string) => {
      if (!user?.id || !profile?.couple_id) {
        return { error: 'You must be paired' }
      }
      const trimmed = text.trim()
      if (!trimmed) return { error: 'Write a short note, or hide it instead.' }
      const result = await writePref({
        hidden: false,
        edited_summary: trimmed,
      })
      if (result.error) return result
      setAiSummary((current) =>
        current
          ? {
              ...current,
              summary: trimmed,
              dismissed: false,
              personallyEdited: true,
            }
          : current,
      )
      return { error: null }
    },
    [profile?.couple_id, user?.id, writePref],
  )

  const dismissSummary = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      return { error: 'You must be paired' }
    }
    const result = await writePref({ hidden: true })
    if (result.error) return result
    setAiSummary((current) =>
      current ? { ...current, dismissed: true } : current,
    )
    return { error: null }
  }, [profile?.couple_id, user?.id, writePref])

  const restoreSummary = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      return { error: 'You must be paired' }
    }
    const original = aiSummary?.originalSummary ?? aiSummary?.summary
    if (!original) return { error: null }
    const result = await writePref({
      hidden: false,
      edited_summary: null,
    })
    if (result.error) return result
    setAiSummary((current) =>
      current
        ? {
            ...current,
            summary: original,
            dismissed: false,
            personallyEdited: false,
          }
        : current,
    )
    return { error: null }
  }, [
    aiSummary?.originalSummary,
    aiSummary?.summary,
    profile?.couple_id,
    user?.id,
    writePref,
  ])

  const bothSubmitted = Boolean(mine && partner && partnerReview)
  const waitingForPartner = Boolean(mine && partner && !partnerReview)
  const needsReview = Boolean(unlocked && partner && !mine)

  return {
    daysConnected: myCheckIns,
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
    aiSummary,
    aiLoading,
    aiError,
    generateAiSummary,
    saveEditedSummary,
    dismissSummary,
    restoreSummary,
    isLoading: isLoading || growthLoading || weekLoading,
    error,
    refresh: async () => {
      await refreshGrowth()
      await refreshWeek()
      await refresh()
    },
    submit,
  }
}

export type PastWeekReview = {
  weekStart: string
  weekEnd: string
  completed: boolean
  waiting: boolean
  summary: string
  source: 'ai' | 'fallback' | 'review'
  mine: WeeklyReviewRow | null
  partnerReview: WeeklyReviewRow | null
}

export function useWeeklyReviewHistory() {
  const { user, profile, partner } = useAuth()
  const [weeks, setWeeks] = useState<PastWeekReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      setWeeks([])
      setIsLoading(false)
      return
    }

    setError(null)
    const coupleId = profile.couple_id
    const [{ data: reviewRows, error: reviewError }, { data: summaryRows }] =
      await Promise.all([
        supabase
          .from('weekly_reviews')
          .select('*')
          .eq('couple_id', coupleId)
          .order('week_start', { ascending: false }),
        supabase
          .from('weekly_ai_summaries')
          .select('*')
          .eq('couple_id', coupleId)
          .order('week_start', { ascending: false }),
      ])

    if (reviewError) {
      setError(reviewError.message)
      setIsLoading(false)
      return
    }

    const myName = 'You'
    const partnerName = partner?.display_name ?? 'Partner'
    const byWeek = new Map<string, PastWeekReview>()

    for (const raw of reviewRows ?? []) {
      const row: WeeklyReviewRow = {
        ...raw,
        answers: parseAnswers(raw.answers),
      }
      const existing = byWeek.get(row.week_start) ?? {
        weekStart: row.week_start,
        weekEnd: row.week_end,
        completed: false,
        waiting: false,
        summary: '',
        source: 'review' as const,
        mine: null,
        partnerReview: null,
      }
      if (row.user_id === user.id) existing.mine = row
      else existing.partnerReview = row
      byWeek.set(row.week_start, existing)
    }

    for (const summary of summaryRows ?? []) {
      const existing = byWeek.get(summary.week_start) ?? {
        weekStart: summary.week_start,
        weekEnd: summary.week_end,
        completed: false,
        waiting: false,
        summary: '',
        source: 'review' as const,
        mine: null,
        partnerReview: null,
      }
      const original = summary.original_summary ?? summary.summary
      if (original?.trim()) {
        existing.summary = original
        existing.source = (summary.source as 'ai' | 'fallback') ?? 'fallback'
      }
      if (!existing.weekEnd) existing.weekEnd = summary.week_end
      byWeek.set(summary.week_start, existing)
    }

    const list: PastWeekReview[] = [...byWeek.values()]
      .map((week) => {
        const completed = Boolean(week.mine && week.partnerReview)
        const waiting = Boolean(
          week.mine && partner?.display_name && !week.partnerReview,
        )
        let summary = week.summary
        let source = week.source
        if (!summary && completed && week.mine && week.partnerReview) {
          summary = buildCompletedReviewSummary({
            weekStart: week.weekStart,
            weekEnd: week.weekEnd,
            myName,
            partnerName,
            mine: week.mine.answers,
            partner: week.partnerReview.answers,
          })
          source = 'review'
        }
        return { ...week, completed, waiting, summary, source }
      })
      .filter((week) => week.completed || week.waiting)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart))

    setWeeks(list)
    setIsLoading(false)
  }, [partner?.display_name, profile?.couple_id, user?.id])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  return { weeks, isLoading, error, refresh }
}
