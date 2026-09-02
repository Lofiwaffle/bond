import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../lib/auth'
import { reportError } from '../lib/monitor'
import { isOnlineNow } from '../lib/network'
import {
  CHALLENGES,
  pickKnowMeQuestion,
  pickMemoryPrompt,
  type PlayKind,
} from '../lib/plays'
import { supabase } from '../lib/supabase'
import type {
  CouplePlay,
  CouplePlayAnswer,
  Json,
  Ritual,
} from '../types/database'

const OFFLINE =
  'Reconnect to share this. It is not in the relationship until Bond confirms it.'
const SCHEMA_NOTE =
  'Together activities need a quick database update. Run supabase/bootstrap.sql, then try again.'

export type PlayWithAnswers = CouplePlay & {
  mine: CouplePlayAnswer | null
  partner: CouplePlayAnswer | null
}

function isSchemaMissing(message: string): boolean {
  return (
    message.includes('schema cache') ||
    message.toLowerCase().includes('does not exist')
  )
}

function friendlyError(message: string): string {
  if (isSchemaMissing(message)) return SCHEMA_NOTE
  return message
}

function promptForKind(kind: PlayKind, coupleId: string): Json {
  if (kind === 'know_me') {
    const question = pickKnowMeQuestion(coupleId, String(Date.now()))
    return question as unknown as Json
  }
  if (kind === 'memory') {
    const prompt = pickMemoryPrompt(coupleId, String(Date.now()))
    return prompt as unknown as Json
  }
  if (kind === 'challenge') {
    const mission =
      CHALLENGES[Math.floor(Date.now() / 1000) % CHALLENGES.length] ??
      CHALLENGES[0]
    return { id: mission.id, label: mission.label } as unknown as Json
  }
  return {}
}

export function useCouplePlays() {
  const { user, profile, partner } = useAuth()
  const [plays, setPlays] = useState<PlayWithAnswers[]>([])
  const [rituals, setRituals] = useState<Ritual[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const coupleId = profile?.couple_id ?? null

  const refresh = useCallback(async () => {
    if (!user?.id || !coupleId) {
      setPlays([])
      setRituals([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const [playRes, answerRes, ritualRes] = await Promise.all([
      supabase
        .from('couple_plays')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false }),
      supabase.from('couple_play_answers').select('*'),
      supabase
        .from('rituals')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false }),
    ])

    if (playRes.error) {
      const message = friendlyError(playRes.error.message)
      if (!isSchemaMissing(playRes.error.message)) {
        reportError('app', playRes.error.message, { op: 'list' })
      }
      setError(message)
      setPlays([])
      setIsLoading(false)
      return
    }

    const answers = (answerRes.data ?? []) as CouplePlayAnswer[]
    const byPlay = new Map<string, CouplePlayAnswer[]>()
    for (const row of answers) {
      const list = byPlay.get(row.play_id) ?? []
      list.push(row)
      byPlay.set(row.play_id, list)
    }

    const next = ((playRes.data ?? []) as CouplePlay[]).map((play) => {
      const rows = byPlay.get(play.id) ?? []
      return {
        ...play,
        mine: rows.find((row) => row.user_id === user.id) ?? null,
        partner: rows.find((row) => row.user_id !== user.id) ?? null,
      }
    })
    setPlays(next)
    setRituals((ritualRes.data ?? []) as Ritual[])
    setError(
      answerRes.error && !isSchemaMissing(answerRes.error.message)
        ? friendlyError(answerRes.error.message)
        : null,
    )
    setIsLoading(false)
  }, [coupleId, user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const openOfKind = useCallback(
    (kind: PlayKind) => plays.find((play) => play.kind === kind && !play.revealed_at) ?? null,
    [plays],
  )

  const startOrOpen = useCallback(
    async (kind: PlayKind, prompt?: Json) => {
      if (!user?.id || !coupleId) return { data: null, error: 'Not paired' }
      if (!isOnlineNow()) return { data: null, error: OFFLINE }
      const existing = openOfKind(kind)
      if (existing) return { data: existing, error: null }
      const { data, error: writeError } = await supabase
        .from('couple_plays')
        .insert({
          couple_id: coupleId,
          kind,
          prompt: prompt ?? promptForKind(kind, coupleId),
          created_by: user.id,
        })
        .select('*')
        .single()
      if (writeError) {
        if (!isSchemaMissing(writeError.message)) {
          reportError('app', writeError.message, { op: 'start' })
        }
        return { data: null, error: friendlyError(writeError.message) }
      }
      await refresh()
      const opened = (data as CouplePlay | null)
        ? {
            ...(data as CouplePlay),
            mine: null,
            partner: null,
          }
        : null
      return { data: opened, error: null }
    },
    [coupleId, openOfKind, refresh, user?.id],
  )

  const answer = useCallback(
    async (playId: string, payload: Json) => {
      if (!user?.id) return { error: 'Not signed in' }
      if (!isOnlineNow()) return { error: OFFLINE }
      const { error: writeError } = await supabase.from('couple_play_answers').insert({
        play_id: playId,
        user_id: user.id,
        payload,
      })
      if (writeError) {
        if (!isSchemaMissing(writeError.message)) {
          reportError('app', writeError.message, { op: 'answer' })
        }
        return { error: friendlyError(writeError.message) }
      }
      await refresh()
      return { error: null }
    },
    [refresh, user?.id],
  )

  const createRitual = useCallback(
    async (input: {
      name: string
      frequency: Ritual['frequency']
      description?: string
    }) => {
      if (!user?.id || !coupleId) return { error: 'Not paired' }
      if (!isOnlineNow()) return { error: OFFLINE }
      const { error: writeError } = await supabase.from('rituals').insert({
        couple_id: coupleId,
        name: input.name.trim(),
        frequency: input.frequency,
        description: input.description?.trim() || undefined,
        streak: 0,
        co_owners: (partner?.id ? [user.id, partner.id] : [user.id, user.id]) as [
          string,
          string,
        ],
      })
      if (writeError) {
        reportError('app', writeError.message, { op: 'ritual-create' })
        return { error: friendlyError(writeError.message) }
      }
      await refresh()
      return { error: null }
    },
    [coupleId, partner?.id, refresh, user?.id],
  )

  const completeRitual = useCallback(
    async (ritual: Ritual) => {
      if (!isOnlineNow()) return { error: OFFLINE }
      const { error: writeError } = await supabase
        .from('rituals')
        .update({
          streak: ritual.streak + 1,
          last_completed: new Date().toISOString(),
        })
        .eq('id', ritual.id)
      if (writeError) {
        reportError('app', writeError.message, { op: 'ritual-complete' })
        return { error: friendlyError(writeError.message) }
      }
      await refresh()
      return { error: null }
    },
    [refresh],
  )

  const latestByKind = useMemo(() => {
    const map = new Map<PlayKind, PlayWithAnswers>()
    for (const play of plays) {
      if (!map.has(play.kind)) map.set(play.kind, play)
    }
    return map
  }, [plays])

  return {
    plays,
    rituals,
    latestByKind,
    openOfKind,
    isLoading,
    error,
    refresh,
    startOrOpen,
    answer,
    createRitual,
    completeRitual,
    partnerId: partner?.id ?? null,
    userId: user?.id ?? null,
  }
}
