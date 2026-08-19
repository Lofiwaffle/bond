import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export function useBidLogging() {
  const { user, profile, couple } = useAuth()
  const [streak, setStreak] = useState(0)
  const [lastDate, setLastDate] = useState('')

  const logTurnToward = useCallback(async (turnedToward: boolean, note?: string) => {
    if (!user?.id || !profile?.couple_id || !couple) return { error: 'Not paired' }

    const today = new Date().toISOString().split('T')[0]
    const result = await supabase.rpc('upsert_bid_log', {
      couple_id: profile.couple_id,
      user_id: user.id,
      date: today,
      turned_toward: turnedToward,
      note,
    })

    if (result.error) return { error: result.error.message }

    // Update streak logic: only count consecutive days of turning toward
    if (turnedToward) {
      const newStreak = lastDate === today ? streak + 1 : 1
      setStreak(newStreak)
      setLastDate(today)
    } else {
      // Reset streak if they miss a bid
      setStreak(0)
    }

    return { data: result.data, error: null }
  }, [user, profile, couple, streak, lastDate])

  const bestStreak = useMemo(() => streak, [streak])

  return { logTurnToward, streak, bestStreak }
}