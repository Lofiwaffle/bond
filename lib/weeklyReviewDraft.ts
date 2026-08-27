import AsyncStorage from '@react-native-async-storage/async-storage'

import type { WeeklyAnswer } from './weeklyPrompts'

export type WeeklyReviewDraft = {
  weekStart: string
  step: number
  answers: WeeklyAnswer[]
}

function draftKey(userId: string, weekStart: string): string {
  return `bond.weekly.draft.${userId}.${weekStart}`
}

export async function loadWeeklyReviewDraft(
  userId: string,
  weekStart: string,
): Promise<WeeklyReviewDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(draftKey(userId, weekStart))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<WeeklyReviewDraft>
    if (!Array.isArray(parsed.answers)) return null
    return {
      weekStart,
      step: typeof parsed.step === 'number' && parsed.step >= 0 ? parsed.step : 0,
      answers: parsed.answers.map((item) => ({
        prompt_id: String(item?.prompt_id ?? ''),
        prompt_text: String(item?.prompt_text ?? ''),
        answer: typeof item?.answer === 'string' ? item.answer : '',
        skipped: Boolean(item?.skipped),
      })),
    }
  } catch {
    return null
  }
}

export async function saveWeeklyReviewDraft(
  userId: string,
  draft: WeeklyReviewDraft,
): Promise<void> {
  await AsyncStorage.setItem(
    draftKey(userId, draft.weekStart),
    JSON.stringify(draft),
  )
}

export async function clearWeeklyReviewDraft(
  userId: string,
  weekStart: string,
): Promise<void> {
  await AsyncStorage.removeItem(draftKey(userId, weekStart))
}
