import { addDays, localDateString } from './dates'

export type SmartGoalDraft = {
  outcome: string
  successCriteria: string
  realisticPlan: string
  why: string
  deadline: string
}

export const DEADLINE_PRESETS = [
  { id: '2w', label: '2 weeks', days: 14 },
  { id: '1m', label: '1 month', days: 30 },
  { id: '3m', label: '3 months', days: 90 },
] as const

export function deadlineFromPreset(days: number): string {
  return addDays(localDateString(), days)
}

export function validateSmartGoal(draft: SmartGoalDraft): string | null {
  const outcome = draft.outcome.trim()
  const successCriteria = draft.successCriteria.trim()
  const realisticPlan = draft.realisticPlan.trim()
  const why = draft.why.trim()
  const deadline = draft.deadline.trim()

  if (outcome.length < 8) {
    return 'Name one specific outcome you can both picture when it’s done.'
  }
  if (outcome.length > 140) {
    return 'Keep the outcome to one short sentence (140 characters).'
  }
  if (successCriteria.length < 8) {
    return 'Add clear success criteria so you’ll know when you’ve reached it.'
  }
  if (successCriteria.length > 200) {
    return 'Keep success criteria under 200 characters.'
  }
  if (realisticPlan.length < 8) {
    return 'Say how this is realistic with the time and resources you have.'
  }
  if (realisticPlan.length > 200) {
    return 'Keep the plan under 200 characters.'
  }
  if (why.length < 8) {
    return 'Connect this goal to a shared value or bigger aim.'
  }
  if (why.length > 200) {
    return 'Keep the value under 200 characters.'
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return 'Set a deadline as YYYY-MM-DD, or tap a timeframe.'
  }
  if (deadline < localDateString()) {
    return 'Pick a deadline that’s today or in the future.'
  }
  return null
}
