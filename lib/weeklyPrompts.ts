import { SCORE_LABELS } from './theme'

export type WeeklyPrompt = {
  id: string
  text: string
}

/** One fixed set. Independent answers, revealed after both finish. */
export const WEEKLY_PROMPTS: WeeklyPrompt[] = [
  {
    id: 'connection',
    text: 'How connected did we feel this week?',
  },
  {
    id: 'stress',
    text: 'Where did stress show up for us?',
  },
  {
    id: 'affection',
    text: 'How was affection this week?',
  },
  {
    id: 'teamwork',
    text: 'How did we work as a team?',
  },
  {
    id: 'plans',
    text: 'What do we want next week to hold?',
  },
  {
    id: 'intention',
    text: 'What is one small action for the coming week?',
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
