import { SCORE_LABELS } from './theme'

export type WeeklyPrompt = {
  id: string
  text: string
}

/** Fixed sets of 3 reflection prompts; couple+week picks one set. */
export const WEEKLY_PROMPT_SETS: WeeklyPrompt[][] = [
  [
    {
      id: 'highlight',
      text: 'What was a highlight of our week together?',
    },
    {
      id: 'support',
      text: 'Where could we support each other better next week?',
    },
    {
      id: 'grateful',
      text: 'What are you most grateful for about us right now?',
    },
  ],
  [
    {
      id: 'closeness',
      text: 'When did you feel closest to me this week?',
    },
    {
      id: 'stress',
      text: 'What stressed you most, and how can I help next time?',
    },
    {
      id: 'looking_forward',
      text: 'What is one thing you want us to look forward to next week?',
    },
  ],
  [
    {
      id: 'appreciate',
      text: 'What is one thing I did this week that you appreciated?',
    },
    {
      id: 'need',
      text: 'Is there anything you need from me in the coming week?',
    },
    {
      id: 'fun',
      text: 'What is something fun we should do together soon?',
    },
  ],
]

export type WeeklyAnswer = {
  prompt_id: string
  prompt_text: string
  answer: string
}

function hashString(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h
}

export function promptsForWeek(coupleId: string, weekStart: string): WeeklyPrompt[] {
  const idx = hashString(`${coupleId}:${weekStart}`) % WEEKLY_PROMPT_SETS.length
  return WEEKLY_PROMPT_SETS[idx]
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
    label: SCORE_LABELS[rounded] ?? 'Stagnant',
  }
}
