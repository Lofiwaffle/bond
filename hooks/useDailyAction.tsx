import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { useAuth } from '../lib/auth'
import { localDateString } from '../lib/dates'
import { reportError } from '../lib/monitor'
import { isOnlineNow } from '../lib/network'
import { supabase } from '../lib/supabase'
import type {
  DailyAction,
  DailyActionKind,
  DailyActionStatus,
} from '../types/database'

const OFFLINE =
  'Reconnect to share this. It is not in the relationship until Bond confirms it.'

type DailyActionContextValue = {
  actions: DailyAction[]
  accepted: DailyAction[]
  firstCompletedDate: string | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  actionForDate: (date?: string) => DailyAction | null
  propose: (
    kind: DailyActionKind,
    text: string,
    date?: string,
  ) => Promise<{ error: string | null }>
  respond: (
    id: string,
    status: Extract<DailyActionStatus, 'accepted' | 'skipped'>,
  ) => Promise<{ error: string | null }>
  complete: (id: string) => Promise<{ error: string | null }>
}

const DailyActionContext = createContext<DailyActionContextValue | undefined>(
  undefined,
)

export function DailyActionProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const [actions, setActions] = useState<DailyAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      setActions([])
      setIsLoading(false)
      return
    }

    setError(null)
    const { data, error: fetchError } = await supabase
      .from('daily_actions')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('check_in_date', { ascending: false })

    if (fetchError) {
      reportError('supabase', fetchError.message, { op: 'daily-action-load' })
      setError(fetchError.message)
      setIsLoading(false)
      return
    }

    setActions((data ?? []) as DailyAction[])
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
        `daily_actions:${profile.couple_id}:${Math.random().toString(36).slice(2)}`,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_actions',
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

  const propose = useCallback(
    async (kind: DailyActionKind, text: string, date = localDateString()) => {
      if (!user?.id || !profile?.couple_id) {
        return { error: 'You must be paired to offer a small action' }
      }
      const trimmed = text.trim()
      if (trimmed.length === 0) {
        return { error: 'Write one small thing first' }
      }
      if (!isOnlineNow()) return { error: OFFLINE }

      const { error: insertError } = await supabase.from('daily_actions').insert({
        couple_id: profile.couple_id,
        check_in_date: date,
        proposed_by: user.id,
        kind,
        text: trimmed,
      })

      if (insertError) {
        if (insertError.code === '23505') {
          await refresh()
          return { error: 'Today already has one small action.' }
        }
        reportError('supabase', insertError.message, { op: 'daily-action-propose' })
        if (
          insertError.message.toLowerCase().includes('failed to fetch') ||
          insertError.message.toLowerCase().includes('network')
        ) {
          return { error: OFFLINE }
        }
        return { error: insertError.message }
      }

      await refresh()
      return { error: null }
    },
    [profile?.couple_id, refresh, user?.id],
  )

  const respond = useCallback(
    async (
      id: string,
      status: Extract<DailyActionStatus, 'accepted' | 'skipped'>,
    ) => {
      if (!user?.id || !profile?.couple_id) {
        return { error: 'You must be paired' }
      }
      if (!isOnlineNow()) return { error: OFFLINE }

      const { data, error: updateError } = await supabase
        .from('daily_actions')
        .update({ status })
        .eq('id', id)
        .eq('couple_id', profile.couple_id)
        .select('id')

      if (updateError) {
        reportError('supabase', updateError.message, { op: 'daily-action-respond' })
        return { error: updateError.message }
      }
      if (!data?.length) {
        await refresh()
        return { error: 'That action is no longer waiting.' }
      }
      await refresh()
      return { error: null }
    },
    [profile?.couple_id, refresh, user?.id],
  )

  const complete = useCallback(
    async (id: string) => {
      if (!user?.id || !profile?.couple_id) {
        return { error: 'You must be paired' }
      }
      if (!isOnlineNow()) return { error: OFFLINE }

      const { data, error: updateError } = await supabase
        .from('daily_actions')
        .update({ status: 'completed' })
        .eq('id', id)
        .eq('couple_id', profile.couple_id)
        .select('id')

      if (updateError) {
        reportError('supabase', updateError.message, {
          op: 'daily-action-complete',
        })
        return { error: updateError.message }
      }
      if (!data?.length) {
        await refresh()
        return { error: 'That action is no longer open.' }
      }
      await refresh()
      return { error: null }
    },
    [profile?.couple_id, refresh, user?.id],
  )

  const actionForDate = useCallback(
    (date = localDateString()) =>
      actions.find((row) => row.check_in_date === date) ?? null,
    [actions],
  )

  const accepted = useMemo(
    () => actions.filter((row) => row.status === 'accepted'),
    [actions],
  )

  const firstCompletedDate = useMemo(() => {
    const done = actions
      .filter((row) => row.status === 'completed' && row.completed_at)
      .map((row) => row.completed_at as string)
      .sort()
    return done[0] ?? null
  }, [actions])

  const value = useMemo(
    () => ({
      actions,
      accepted,
      firstCompletedDate,
      isLoading,
      error,
      refresh,
      actionForDate,
      propose,
      respond,
      complete,
    }),
    [
      accepted,
      actionForDate,
      actions,
      complete,
      error,
      firstCompletedDate,
      isLoading,
      propose,
      refresh,
      respond,
    ],
  )

  return (
    <DailyActionContext.Provider value={value}>
      {children}
    </DailyActionContext.Provider>
  )
}

export function useDailyAction(): DailyActionContextValue {
  const ctx = useContext(DailyActionContext)
  if (!ctx) {
    throw new Error('useDailyAction must be used within DailyActionProvider')
  }
  return ctx
}
