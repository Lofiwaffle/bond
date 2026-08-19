import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '../lib/auth'
import type { BadgeId } from '../lib/badges'
import { supabase } from '../lib/supabase'
import type { HabitCompletion } from '../types/database'

const EMPTY_COUNTS: Record<BadgeId, number> = {
  spark: 0,
  glow: 0,
  forge: 0,
  bond: 0,
  sync: 0,
}

export function useHabitBadges() {
  const { user, profile } = useAuth()
  const [completions, setCompletions] = useState<HabitCompletion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      setCompletions([])
      setIsLoading(false)
      return
    }

    setError(null)
    const { data, error: fetchError } = await supabase
      .from('habit_completions')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setIsLoading(false)
      return
    }

    setCompletions(data ?? [])
    setIsLoading(false)
  }, [profile?.couple_id, user?.id])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  const logHabit = useCallback(
    async (habitId: BadgeId, note?: string) => {
      if (!user?.id || !profile?.couple_id) {
        return { error: 'You must be paired to log a habit' }
      }

      const trimmed = note?.trim()
      const { error: insertError } = await supabase
        .from('habit_completions')
        .insert({
          couple_id: profile.couple_id,
          user_id: user.id,
          habit_id: habitId,
          note: trimmed && trimmed.length > 0 ? trimmed : null,
        })

      if (insertError) {
        return { error: insertError.message }
      }

      await refresh()
      return { error: null }
    },
    [profile?.couple_id, refresh, user?.id],
  )

  const counts = completions.reduce<Record<BadgeId, number>>(
    (acc, c) => {
      const id = c.habit_id as BadgeId
      acc[id] = (acc[id] ?? 0) + 1
      return acc
    },
    { ...EMPTY_COUNTS },
  )

  return { completions, counts, isLoading, error, refresh, logHabit }
}
