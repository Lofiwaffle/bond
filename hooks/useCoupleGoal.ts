import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { CoupleGoal, CoupleGoalReview } from '../types/database'
import {
  validateSmartGoal,
  type SmartGoalDraft,
} from '../lib/smartGoal'

function isSchemaMissing(message: string): boolean {
  return (
    message.includes('schema cache') ||
    message.toLowerCase().includes('does not exist')
  )
}

export function useCoupleGoal() {
  const { user, profile } = useAuth()
  const [goals, setGoals] = useState<CoupleGoal[]>([])
  const [reviews, setReviews] = useState<CoupleGoalReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      setGoals([])
      setReviews([])
      setIsLoading(false)
      return
    }

    setError(null)
    const coupleId = profile.couple_id
    const [goalsResult, reviewsResult] = await Promise.all([
      supabase
        .from('couple_goals')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false }),
      supabase
        .from('couple_goal_reviews')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false }),
    ])

    if (goalsResult.error) {
      setError(
        isSchemaMissing(goalsResult.error.message)
          ? 'Shared goals need a database update before they can be saved.'
          : goalsResult.error.message,
      )
      setIsLoading(false)
      return
    }
    if (reviewsResult.error) {
      setError(reviewsResult.error.message)
      setIsLoading(false)
      return
    }

    setGoals(goalsResult.data ?? [])
    setReviews(reviewsResult.data ?? [])
    setIsLoading(false)
  }, [profile?.couple_id, user?.id])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  const activeGoals = useMemo(
    () =>
      [...goals.filter((goal) => goal.status === 'active')].sort((a, b) => {
        if (a.deadline && b.deadline && a.deadline !== b.deadline) {
          return a.deadline.localeCompare(b.deadline)
        }
        if (a.deadline && !b.deadline) return -1
        if (!a.deadline && b.deadline) return 1
        return b.created_at.localeCompare(a.created_at)
      }),
    [goals],
  )
  const completed = useMemo(
    () => goals.filter((goal) => goal.status === 'completed'),
    [goals],
  )

  const reviewsFor = useCallback(
    (goalId: string) => reviews.filter((review) => review.goal_id === goalId),
    [reviews],
  )

  const setGoal = useCallback(
    async (draft: SmartGoalDraft) => {
      if (!user?.id || !profile?.couple_id) {
        return { goal: null, error: 'You must be paired to set a goal' }
      }

      const invalid = validateSmartGoal(draft)
      if (invalid) return { goal: null, error: invalid }

      const payload = {
        couple_id: profile.couple_id,
        created_by: user.id,
        outcome: draft.outcome.trim(),
        success_criteria: draft.successCriteria.trim(),
        realistic_plan: draft.realisticPlan.trim(),
        why: draft.why.trim(),
        deadline: draft.deadline.trim(),
        status: 'active' as const,
      }

      const { data, error: insertError } = await supabase
        .from('couple_goals')
        .insert(payload)
        .select('*')
        .single()

      if (insertError) {
        const missingSmartColumns =
          insertError.message.includes('success_criteria') ||
          insertError.message.includes('realistic_plan') ||
          insertError.message.includes('deadline') ||
          insertError.code === 'PGRST204'
        if (missingSmartColumns) {
          const packedWhy = [
            draft.why.trim(),
            `Success: ${draft.successCriteria.trim()}`,
            `Plan: ${draft.realisticPlan.trim()}`,
            `By: ${draft.deadline.trim()}`,
          ].join(' · ')
          const retry = await supabase
            .from('couple_goals')
            .insert({
              couple_id: profile.couple_id,
              created_by: user.id,
              outcome: draft.outcome.trim(),
              why: packedWhy.slice(0, 280),
              status: 'active',
            })
            .select('*')
            .single()
          if (retry.error) {
            return { goal: null, error: retry.error.message }
          }
          await refresh()
          return { goal: retry.data, error: null }
        }
        return { goal: null, error: insertError.message }
      }

      await refresh()
      return { goal: data, error: null }
    },
    [profile?.couple_id, refresh, user?.id],
  )

  const addReview = useCallback(
    async (goalId: string, note: string) => {
      if (!user?.id || !profile?.couple_id) {
        return { error: 'Set a shared goal first' }
      }

      const trimmed = note.trim()
      if (trimmed.length < 1) {
        return { error: 'Write a short review note' }
      }
      if (trimmed.length > 500) {
        return { error: 'Keep the review under 500 characters' }
      }

      const { error: insertError } = await supabase
        .from('couple_goal_reviews')
        .insert({
          goal_id: goalId,
          couple_id: profile.couple_id,
          user_id: user.id,
          note: trimmed,
        })

      if (insertError) return { error: insertError.message }
      await refresh()
      return { error: null }
    },
    [profile?.couple_id, refresh, user?.id],
  )

  const completeGoal = useCallback(
    async (goalId: string) => {
      const { error: updateError } = await supabase
        .from('couple_goals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', goalId)

      if (updateError) return { error: updateError.message }
      await refresh()
      return { error: null }
    },
    [refresh],
  )

  return {
    goals,
    activeGoals,
    completed,
    reviewsFor,
    isLoading,
    error,
    refresh,
    setGoal,
    addReview,
    completeGoal,
  }
}
