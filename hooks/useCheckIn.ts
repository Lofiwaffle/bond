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
    async (score: number, note: string) => {
      if (!user?.id || !profile?.couple_id) {
        return { error: 'You must be paired to check in' }
      }
      if (score < 1 || score > 5) {
        return { error: 'Choose a score from 1 to 5' }
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
      .limit(60)

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
