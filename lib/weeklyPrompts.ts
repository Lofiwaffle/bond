import { SCORE_LABELS } from './theme'

export type WeeklyPrompt = {
  id: string
  text: string
}

/** One fixed set. Independent answers, revealed after both finish. */
export const WEEKLY_PROMPTS: WeeklyPrompt[] = [
  {
    id: 'felt_good',
    text: 'What felt good this week?',
  },
  {
    id: 'disconnected',
    text: 'Where did you feel disconnected?',
  },
  {
    id: 'appreciate',
    text: 'What did your partner do that you appreciated?',
  },
  {
    id: 'support',
    text: 'What support would help next week?',
  },
  {
    id: 'intention',
    text: 'What is one small shared intention for next week?',
  },
]

export type WeeklyAnswer = {
  prompt_id: string
  prompt_text: string
  answer: string
  skipped?: boolean
}

export const NO_WORDS_THIS_WEEK = 'No words this week.'

export function displayWeeklyAnswer(answer: WeeklyAnswer | undefined): string {
  if (!answer) return ''
  if (answer.skipped) return NO_WORDS_THIS_WEEK
  return answer.answer.trim()
}

export function weeklyAnswerIsComplete(answer: WeeklyAnswer | undefined): boolean {
  if (!answer) return false
  return Boolean(answer.skipped || answer.answer.trim())
}

export function promptsForWeek(_coupleId?: string, _weekStart?: string): WeeklyPrompt[] {
  return WEEKLY_PROMPTS
}

export function summarizeScores(scores: number[]): {
  avg: number | null
  label: string
} {
  if (scores.length === 0) return { avg: null, label: 'No data' }
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const rounded = Math.round(avg)
  return {
    avg,
    label: SCORE_LABELS[rounded] ?? 'Neutral',
  }
}

export function intentionAnswers(answers: WeeklyAnswer[]): string {
  const row = answers.find((item) => item.prompt_id === 'intention')
  if (!row || row.skipped) return ''
  return row.answer.trim()
}
