import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

// Appreciation categories matching the DB check constraint
const APPRECIATION_CATEGORIES = [
  'support',
  'humor',
  'effort',
  'presence',
  'other',
] as const

type AppreciationCategory = (typeof APPRECIATION_CATEGORIES)[number]

export function useAppreciation() {
  const { user, profile, couple, partner } = useAuth()
  const [pendingCategory, setPendingCategory] =
    useState<AppreciationCategory | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)

  const tapAppreciation = useCallback(
    async (category: AppreciationCategory, message?: string) => {
      if (!user?.id || !profile?.couple_id || !couple)
        return { error: 'Not paired' }

      const toUserId = partner?.id || ''

      const result = await supabase.rpc('upsert_appreciation', {
        couple_id: profile.couple_id,
        from_user_id: user.id,
        to_user_id: toUserId,
        category,
        message,
      })

      if (result.error) return { error: result.error.message }

      setPendingCategory(null)
      setPendingMessage(null)
      return { data: result.data, error: null }
    },
    [user, profile, couple, partner],
  )

  return {
    tapAppreciation,
    APPRECIATION_CATEGORIES,
    pendingCategory,
    setPendingCategory,
    pendingMessage,
    setPendingMessage,
  }
}