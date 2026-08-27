import { OFFER_AFTER_REVEALS } from './bondPlus'
import {
  SIMILAR_MAX_GAP,
  type ObservationDay,
} from './growthObservations'

export type FirstInsight = {
  title: string
  body: string
}

/** One free reading after three mutual reveals. Not a diagnosis. */
export function firstInsight(days: ObservationDay[]): FirstInsight | null {
  const opened = days
    .filter(
      (day) =>
        day.mine >= 1 &&
        day.mine <= 5 &&
        day.partner >= 1 &&
        day.partner <= 5,
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  if (opened.length < OFFER_AFTER_REVEALS) return null

  const similar = opened.filter(
    (day) => Math.abs(day.mine - day.partner) <= SIMILAR_MAX_GAP,
  ).length

  if (similar >= Math.ceil(opened.length / 2)) {
    return {
      title: 'A first look',
      body: `We noticed you both often chose a similar connection label on opened days (${similar} of ${opened.length}). That is a reading of labels, not a verdict.`,
    }
  }

  return {
    title: 'A first look',
    body: `We noticed your labels sometimes differ on opened days (${opened.length - similar} of ${opened.length}). That is information, not a verdict.`,
  }
}
