import { activityById } from './activities'
import { SCORE_LABELS } from './theme'
import type { DailyCheckIn } from '../types/database'

export const NO_WORDS_LABEL = "I didn't have words today."

export function displaySharedWords(answer: string | null | undefined): string {
  const trimmed = answer?.trim()
  return trimmed ? trimmed : NO_WORDS_LABEL
}

export type RevealActionId = 'appreciate' | 'support' | 'plan'

export type RevealAction = {
  id: RevealActionId
  label: string
  prompt: string
}

export const REVEAL_ACTIONS: RevealAction[] = [
  {
    id: 'appreciate',
    label: 'Appreciate',
    prompt: 'Name one thing you appreciated about them today.',
  },
  {
    id: 'support',
    label: 'Ask for support',
    prompt: 'What is one small thing you need tonight?',
  },
  {
    id: 'plan',
    label: 'Plan tomorrow',
    prompt: 'What is one gentle plan for tomorrow?',
  },
]

function activityLabels(ids: string[] | null | undefined): string[] {
  return (ids ?? [])
    .map((id) => activityById(id)?.label)
    .filter((label): label is string => Boolean(label))
}

export function revealReflection(
  mine: DailyCheckIn,
  partner: DailyCheckIn,
  partnerName: string,
): {
  commonGround: string
  difference: string | null
  starter: string
  suggestedAction: RevealActionId
} {
  const myLabel = SCORE_LABELS[mine.score] ?? 'Neutral'
  const theirLabel = SCORE_LABELS[partner.score] ?? 'Neutral'
  const gap = Math.abs(mine.score - partner.score)
  const mineWords = Boolean(mine.prompt_answer?.trim())
  const theirsWords = Boolean(partner.prompt_answer?.trim())
  const mineActs = activityLabels(mine.activities)
  const theirActs = activityLabels(partner.activities)
  const sharedActs = mineActs.filter((label) => theirActs.includes(label))

  let commonGround = `You both checked in. That is the ritual.`
  if (gap === 0) {
    commonGround = `You both felt ${myLabel.toLowerCase()}.`
  } else if (sharedActs.length > 0) {
    commonGround = `You both named ${sharedActs[0].toLowerCase()}.`
  } else if (!mineWords && !theirsWords) {
    commonGround = `Neither of you had words. That is allowed.`
  }

  let difference: string | null = null
  if (gap >= 2) {
    difference = `You felt ${myLabel.toLowerCase()}. ${partnerName} felt ${theirLabel.toLowerCase()}. Different temperatures, same day.`
  } else if (gap === 1) {
    difference = `Close: you felt ${myLabel.toLowerCase()}, they felt ${theirLabel.toLowerCase()}.`
  } else if (mineWords !== theirsWords) {
    difference = mineWords
      ? `${partnerName} didn't have words today.`
      : `You didn't have words. ${partnerName} did.`
  } else if (mineActs.length && theirActs.length && sharedActs.length === 0) {
    difference = `You named ${mineActs[0].toLowerCase()}. They named ${theirActs[0].toLowerCase()}.`
  }

  let starter = 'If talking together feels safe, what felt true about today?'
  let suggestedAction: RevealActionId = 'plan'
  if (gap === 0 && mine.score >= 4) {
    starter = 'If it feels safe, what made today feel close?'
    suggestedAction = 'appreciate'
  } else if (gap === 0 && mine.score <= 2) {
    starter = 'If it feels safe, what is one small thing you need tonight?'
    suggestedAction = 'support'
  } else if (gap >= 2) {
    starter = 'If it feels safe, what would have helped a little today?'
    suggestedAction = 'support'
  } else if (sharedActs.includes('Food') || sharedActs.includes('Home')) {
    starter = 'If it feels safe, want a quiet meal or evening at home tomorrow?'
    suggestedAction = 'plan'
  } else if (!mineWords || !theirsWords) {
    starter = 'Talking is optional. Sitting nearby without a conversation is enough.'
    suggestedAction = 'appreciate'
  }

  return { commonGround, difference, starter, suggestedAction }
}
