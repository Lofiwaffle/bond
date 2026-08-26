import AsyncStorage from '@react-native-async-storage/async-storage'

import type { ActivityId } from './activities'
import { localDateString } from './dates'

export type CheckInDraft = {
  date: string
  score: number | null
  activities: ActivityId[]
  promptAnswer: string
  noWords: boolean
  step: 'score' | 'words' | 'extras'
}

const EMPTY: Omit<CheckInDraft, 'date'> = {
  score: null,
  activities: [],
  promptAnswer: '',
  noWords: false,
  step: 'score',
}

function draftKey(userId: string, date: string): string {
  return `bond.checkin.draft.${userId}.${date}`
}

function privateKey(userId: string, date: string): string {
  return `bond.checkin.private.${userId}.${date}`
}

function nudgeKey(userId: string, date: string): string {
  return `bond.checkin.nudge.${userId}.${date}`
}

function actionKey(userId: string, date: string): string {
  return `bond.checkin.action.${userId}.${date}`
}

export async function loadCheckInDraft(
  userId: string,
  date = localDateString(),
): Promise<CheckInDraft> {
  try {
    const raw = await AsyncStorage.getItem(draftKey(userId, date))
    if (!raw) return { date, ...EMPTY }
    const parsed = JSON.parse(raw) as Partial<CheckInDraft>
    return {
      date,
      score: typeof parsed.score === 'number' ? parsed.score : null,
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
      promptAnswer:
        typeof parsed.promptAnswer === 'string' ? parsed.promptAnswer : '',
      noWords: Boolean(parsed.noWords),
      step:
        parsed.step === 'words' || parsed.step === 'extras'
          ? parsed.step
          : 'score',
    }
  } catch {
    return { date, ...EMPTY }
  }
}

export async function saveCheckInDraft(
  userId: string,
  draft: CheckInDraft,
): Promise<void> {
  await AsyncStorage.setItem(draftKey(userId, draft.date), JSON.stringify(draft))
}

export async function clearCheckInDraft(
  userId: string,
  date = localDateString(),
): Promise<void> {
  await AsyncStorage.removeItem(draftKey(userId, date))
}

export async function loadPrivateThought(
  userId: string,
  date = localDateString(),
): Promise<string> {
  return (await AsyncStorage.getItem(privateKey(userId, date))) ?? ''
}

export async function savePrivateThought(
  userId: string,
  thought: string,
  date = localDateString(),
): Promise<void> {
  await AsyncStorage.setItem(privateKey(userId, date), thought)
}

export async function hasSentNudge(
  userId: string,
  date = localDateString(),
): Promise<boolean> {
  return (await AsyncStorage.getItem(nudgeKey(userId, date))) === 'true'
}

export async function markNudgeSent(
  userId: string,
  date = localDateString(),
): Promise<void> {
  await AsyncStorage.setItem(nudgeKey(userId, date), 'true')
}

export type SavedRevealAction = {
  id: 'appreciate' | 'support' | 'plan'
  text: string
}

export async function loadRevealAction(
  userId: string,
  date = localDateString(),
): Promise<SavedRevealAction | null> {
  const raw = await AsyncStorage.getItem(actionKey(userId, date))
  if (!raw) return null
  try {
    return JSON.parse(raw) as SavedRevealAction
  } catch {
    return null
  }
}

export async function saveRevealAction(
  userId: string,
  action: SavedRevealAction,
  date = localDateString(),
): Promise<void> {
  await AsyncStorage.setItem(actionKey(userId, date), JSON.stringify(action))
}
