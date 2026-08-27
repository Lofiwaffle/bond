/**
 * Client-side fallback when the edge function is unavailable.
 * Quotes original words. No diagnosis, blame, or partner ranking.
 */
import { SCORE_LABELS } from './theme'
import { activityById } from './activities'
import { formatDisplayDate } from './dates'
import { displayWeeklyAnswer, type WeeklyAnswer } from './weeklyPrompts'

export type WeekCheckInSlice = {
  date: string
  mine: {
    score: number
    note: string | null
    activities?: string[] | null
    prompt_answer?: string | null
  } | null
  partner: {
    score: number
    note: string | null
    activities?: string[] | null
    prompt_answer?: string | null
  } | null
  revealed: boolean
}

function activityLine(ids: string[] | null | undefined): string {
  if (!ids?.length) return ''
  const labels = ids
    .map((id) => activityById(id)?.label ?? id)
    .filter(Boolean)
  return labels.length ? ` ${labels.join(', ')}.` : ''
}

export function buildFallbackWeeklySummary(input: {
  weekStart: string
  weekEnd: string
  partnerName: string
  days: WeekCheckInSlice[]
  mineAnswers?: WeeklyAnswer[]
  partnerAnswers?: WeeklyAnswer[]
}): string {
  const { weekStart, weekEnd, partnerName, days } = input
  const lines: string[] = []
  lines.push(
    `A suggested reading of ${formatDisplayDate(weekStart)} – ${formatDisplayDate(weekEnd)}. Not a verdict.`,
  )

  const myDays = days.filter((d) => d.mine).length
  const openDays = days.filter((d) => d.revealed).length
  lines.push(
    `You checked in on ${myDays} day${myDays === 1 ? '' : 's'}. ${openDays} day${openDays === 1 ? '' : 's'} opened for both of you.`,
  )

  lines.push('Days you named:')
  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!day.mine && !(day.revealed && day.partner)) continue
    const label = formatDisplayDate(day.date)
    const parts: string[] = [`• ${label}:`]
    if (day.mine) {
      parts.push(`you felt ${SCORE_LABELS[day.mine.score] ?? 'Neutral'}.${activityLine(day.mine.activities)}`)
      const words = day.mine.prompt_answer?.trim() || day.mine.note?.trim()
      if (words) parts.push(`You wrote: “${words}”.`)
    }
    if (day.revealed && day.partner) {
      parts.push(
        `${partnerName} felt ${SCORE_LABELS[day.partner.score] ?? 'Neutral'}.${activityLine(day.partner.activities)}`,
      )
      const words = day.partner.prompt_answer?.trim() || day.partner.note?.trim()
      if (words) parts.push(`They wrote: “${words}”.`)
    }
    lines.push(parts.join(' '))
  }

  const prompts = input.mineAnswers?.length
    ? input.mineAnswers
    : input.partnerAnswers ?? []
  if (prompts.length && input.mineAnswers && input.partnerAnswers) {
    lines.push('Your words from last week’s review:')
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i]?.prompt_text?.trim()
      if (!prompt) continue
      const yours = displayWeeklyAnswer(input.mineAnswers[i])
      const theirs = displayWeeklyAnswer(input.partnerAnswers[i])
      lines.push(prompt)
      if (yours) lines.push(`You: ${yours}`)
      if (theirs) lines.push(`${partnerName}: ${theirs}`)
    }
  }

  lines.push(
    'This is a suggestion for conversation, not a diagnosis of the relationship.',
  )
  return lines.join('\n')
}

/** Recap of a finished weekly reflection after both partners submitted. */
export function buildCompletedReviewSummary(input: {
  weekStart: string
  weekEnd: string
  myName: string
  partnerName: string
  mine: WeeklyAnswer[]
  partner: WeeklyAnswer[]
}): string {
  const lines: string[] = [
    `Weekly review (${formatDisplayDate(input.weekStart)} – ${formatDisplayDate(input.weekEnd)}).`,
  ]

  const prompts = input.mine.length ? input.mine : input.partner
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]?.prompt_text?.trim()
    if (!prompt) continue
    const yours = displayWeeklyAnswer(input.mine[i])
    const theirs = displayWeeklyAnswer(input.partner[i])
    lines.push(prompt)
    if (yours) lines.push(`${input.myName}: ${yours}`)
    if (theirs) lines.push(`${input.partnerName}: ${theirs}`)
  }

  if (lines.length === 1) {
    lines.push('You finished this week’s review together.')
  }

  return lines.join('\n')
}
