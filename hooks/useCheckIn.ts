import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '../lib/auth'
import { localDateString } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { DailyCheckIn } from '../types/database'

export function useTodayCheckIn() {
  const { user, profile, partner } = useAuth()
  const [mine, setMine] = useState<DailyCheckIn | null>(null)
  const [partnerCheckIn, setPartnerCheckIn] = useState<DailyCheckIn | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      setMine(null)
      setPartnerCheckIn(null)
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

    if (fetchError) {
      setError(fetchError.message)
      setIsLoading(false)
      return
    }

    const rows = data ?? []
    setMine(rows.find((row) => row.user_id === user.id) ?? null)
    setPartnerCheckIn(rows.find((row) => row.user_id !== user.id) ?? null)
    setIsLoading(false)
  }, [profile?.couple_id, user?.id])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  const submit = useCallback(
    async (score: number, note: string, activities: string[] = []) => {
      if (!user?.id || !profile?.couple_id) {
        return { error: 'You must be paired to check in' }
      }
      if (score < 1 || score > 5) {
        return { error: 'Choose a score from 1 to 5' }
      }
      if (activities.length > 5) {
        return { error: 'Pick up to 5 activity tags' }
      }

      const trimmed = note.trim()
      const { error: insertError } = await supabase
        .from('daily_check_ins')
        .insert({
          couple_id: profile.couple_id,
          user_id: user.id,
          check_in_date: localDateString(),
          score,
          note: trimmed.length > 0 ? trimmed : null,
          activities,
        })

      if (insertError) {
        return { error: insertError.message }
      }

      await refresh()
      return { error: null }
    },
    [profile?.couple_id, refresh, user?.id],
  )

  const bothSubmitted = Boolean(mine && partner && partnerCheckIn)
  const waitingForPartner = Boolean(mine && partner && !partnerCheckIn)

  return {
    mine,
    partnerCheckIn,
    bothSubmitted,
    waitingForPartner,
    isLoading,
    error,
    refresh,
    submit,
  }
}

export type HistoryDay = {
  date: string
  mine: DailyCheckIn | null
  partner: DailyCheckIn | null
  revealed: boolean
}

export function useCheckInHistory() {
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
      setError(fetchError.message)
      setIsLoading(false)
      return
    }

    const byDate = new Map<string, HistoryDay>()
    for (const row of data ?? []) {
      const existing = byDate.get(row.check_in_date) ?? {
        date: row.check_in_date,
        mine: null,
        partner: null,
        revealed: false,
      }
      if (row.user_id === user.id) {
        existing.mine = row
      } else {
        existing.partner = row
      }
      existing.revealed = Boolean(existing.mine && existing.partner)
      byDate.set(row.check_in_date, existing)
    }

    setDays([...byDate.values()])
    setIsLoading(false)
  }, [profile?.couple_id, user?.id])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  return { days, isLoading, error, refresh }
}

export type MonthDayData = {
  date: string
  mine: DailyCheckIn | null
  partner: DailyCheckIn | null
  revealed: boolean
}

export function useMonthCheckIns(year: number, monthIndex: number) {
  const { user, profile } = useAuth()
  const [byDate, setByDate] = useState<Record<string, MonthDayData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      setByDate({})
      setIsLoading(false)
      return
    }

    const start = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, monthIndex + 1, 0).getDate()
    const end = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    setError(null)
    const { data, error: fetchError } = await supabase
      .from('daily_check_ins')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .gte('check_in_date', start)
      .lte('check_in_date', end)

    if (fetchError) {
      setError(fetchError.message)
      setIsLoading(false)
      return
    }

    const map: Record<string, MonthDayData> = {}
    for (const row of data ?? []) {
      const existing = map[row.check_in_date] ?? {
        date: row.check_in_date,
        mine: null,
        partner: null,
        revealed: false,
      }
      if (row.user_id === user.id) existing.mine = row
      else existing.partner = row
      existing.revealed = Boolean(existing.mine && existing.partner)
      map[row.check_in_date] = existing
    }

    setByDate(map)
    setIsLoading(false)
  }, [monthIndex, profile?.couple_id, user?.id, year])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  return { byDate, isLoading, error, refresh }
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
