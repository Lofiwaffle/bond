import { Platform, Share } from 'react-native'
import * as Clipboard from 'expo-clipboard'

import { reportError } from './monitor'
import { EXPORT_NOTE } from './privacy'
import { supabase } from './supabase'

type ExportBundle = {
  exported_at: string
  note: string
  profile: unknown
  couple: unknown
  daily_check_ins: unknown[]
  daily_actions: unknown[]
  weekly_reviews: unknown[]
  weekly_ai_summaries: unknown[]
  weekly_ai_summary_prefs: unknown[]
  couple_goals: unknown[]
  couple_goal_reviews: unknown[]
  habit_completions: unknown[]
  bid_logs: unknown[]
  appreciations: unknown[]
  rituals: unknown[]
  couple_plays: unknown[]
  couple_play_answers: unknown[]
  notification_preferences: unknown
}

async function rows(table: string): Promise<unknown[]> {
  const { data, error } = await supabase.from(table).select('*')
  if (error) {
    reportError('export', error.message, { table })
    return []
  }
  return data ?? []
}

export async function buildExportBundle(userId: string): Promise<ExportBundle> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  const coupleId = profile?.couple_id as string | null | undefined
  let couple: unknown = null
  if (coupleId) {
    const { data } = await supabase
      .from('couples')
      .select('*')
      .eq('id', coupleId)
      .maybeSingle()
    couple = data
  }

  const [
    daily_check_ins,
    daily_actions,
    weekly_reviews,
    weekly_ai_summaries,
    weekly_ai_summary_prefs,
    couple_goals,
    couple_goal_reviews,
    habit_completions,
    bid_logs,
    appreciations,
    rituals,
    couple_plays,
    couple_play_answers,
    prefsRow,
  ] = await Promise.all([
    rows('daily_check_ins'),
    rows('daily_actions'),
    rows('weekly_reviews'),
    rows('weekly_ai_summaries'),
    rows('weekly_ai_summary_prefs'),
    rows('couple_goals'),
    rows('couple_goal_reviews'),
    rows('habit_completions'),
    rows('bid_logs'),
    rows('appreciations'),
    rows('rituals'),
    rows('couple_plays'),
    rows('couple_play_answers'),
    rows('notification_preferences'),
  ])

  return {
    exported_at: new Date().toISOString(),
    note: EXPORT_NOTE,
    profile,
    couple,
    daily_check_ins,
    daily_actions,
    weekly_reviews,
    weekly_ai_summaries,
    weekly_ai_summary_prefs,
    couple_goals,
    couple_goal_reviews,
    habit_completions,
    bid_logs,
    appreciations,
    rituals,
    couple_plays,
    couple_play_answers,
    notification_preferences: prefsRow[0] ?? null,
  }
}

function fileName(): string {
  return `bond-export-${new Date().toISOString().slice(0, 10)}.json`
}

export async function shareExportBundle(
  bundle: ExportBundle,
): Promise<{ error: string | null }> {
  const json = `${JSON.stringify(bundle, null, 2)}\n`

  try {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName()
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      return { error: null }
    }

    const result = await Share.share({
      title: 'Bond data export',
      message: json,
    })
    if (result.action === Share.dismissedAction) {
      return { error: null }
    }
    return { error: null }
  } catch (error) {
    try {
      await Clipboard.setStringAsync(json)
      return { error: null }
    } catch (copyError) {
      reportError('export', copyError)
      const message =
        error instanceof Error ? error.message : 'Could not export data'
      return { error: message }
    }
  }
}
