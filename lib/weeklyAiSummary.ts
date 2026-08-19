/**
 * Client-side fallback narrative when the edge function / OpenAI is unavailable.
 * Still walks every daily check-in in the week.
 */
import { SCORE_LABELS } from './theme'
import { activityById } from './activities'
import { formatDisplayDate } from './dates'

export type WeekCheckInSlice = {
  date: string
  mine: {
    score: number
    note: string | null
    activities?: string[] | null
  } | null
  partner: {
    score: number
    note: string | null
    activities?: string[] | null
  } | null
  revealed: boolean
}

function activityLine(ids: string[] | null | undefined): string {
  if (!ids?.length) return ''
  const labels = ids
    .map((id) => activityById(id)?.label ?? id)
    .filter(Boolean)
  return labels.length ? ` Activities: ${labels.join(', ')}.` : ''
}

export function buildFallbackWeeklySummary(input: {
  weekStart: string
  weekEnd: string
  partnerName: string
  days: WeekCheckInSlice[]
}): string {
  const { weekStart, weekEnd, partnerName, days } = input
  const lines: string[] = []
  lines.push(
    `Bond week summary (${formatDisplayDate(weekStart)} – ${formatDisplayDate(weekEnd)}).`,
  )

  const myScores = days
    .map((d) => d.mine?.score)
    .filter((s): s is number => typeof s === 'number')
  const partnerScores = days
    .filter((d) => d.revealed && d.partner)
    .map((d) => d.partner!.score)

  if (myScores.length) {
    const avg = myScores.reduce((a, b) => a + b, 0) / myScores.length
    lines.push(
      `Your average connection was ${avg.toFixed(1)} (${SCORE_LABELS[Math.round(avg)] ?? 'Okay'}) across ${myScores.length} check-in${myScores.length === 1 ? '' : 's'}.`,
    )
  } else {
    lines.push('You have no daily check-ins logged for this week yet.')
  }

  if (partnerScores.length) {
    const avg = partnerScores.reduce((a, b) => a + b, 0) / partnerScores.length
    lines.push(
      `${partnerName}'s revealed average was ${avg.toFixed(1)} (${SCORE_LABELS[Math.round(avg)] ?? 'Okay'}).`,
    )
  }

  lines.push('Day by day:')
  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    const label = formatDisplayDate(day.date)
    if (!day.mine && !day.partner) {
      lines.push(`• ${label}: no check-ins.`)
      continue
    }
    const parts: string[] = [`• ${label}:`]
    if (day.mine) {
      parts.push(
        `you ${day.mine.score}/5 (${SCORE_LABELS[day.mine.score]})${activityLine(day.mine.activities)}.`,
      )
      if (day.mine.note?.trim()) {
        parts.push(`Your note: “${day.mine.note.trim()}”.`)
      }
    } else {
      parts.push('you did not check in.')
    }
    if (day.revealed && day.partner) {
      parts.push(
        `${partnerName} ${day.partner.score}/5 (${SCORE_LABELS[day.partner.score]})${activityLine(day.partner.activities)}.`,
      )
      if (day.partner.note?.trim()) {
        parts.push(`Their note: “${day.partner.note.trim()}”.`)
      }
    } else if (day.mine && !day.revealed) {
      parts.push(`${partnerName}'s entry is still hidden.`)
    }
    lines.push(parts.join(' '))
  }

  lines.push(
    'Keep showing up for each other — small daily check-ins are how Bond grows.',
  )
  return lines.join('\n')
}
