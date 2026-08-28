import { addDays } from './dates'
import {
  FREE_HISTORY_DAYS,
  GRACE_DAYS,
  OFFER_AFTER_REVEALS,
  type PlusPlan,
} from './bondPlus'

export type PlusLifecycle =
  | 'none'
  | 'trialing'
  | 'active'
  | 'grace'
  | 'expired'
  | 'paused'

export type PlusSnapshot = {
  status: PlusLifecycle
  plan: PlusPlan | null
  trialEndsAt: string | null
  periodEndsAt: string | null
  graceEndsAt: string | null
  now?: Date
}

export function isPlusActive(snapshot: PlusSnapshot): boolean {
  const now = snapshot.now ?? new Date()
  if (snapshot.status === 'paused' || snapshot.status === 'none') return false
  if (snapshot.status === 'expired') return false
  if (snapshot.status === 'trialing') {
    return snapshot.trialEndsAt ? new Date(snapshot.trialEndsAt) > now : false
  }
  if (snapshot.status === 'active') {
    if (!snapshot.periodEndsAt) return true
    return new Date(snapshot.periodEndsAt) > now
  }
  if (snapshot.status === 'grace') {
    return snapshot.graceEndsAt ? new Date(snapshot.graceEndsAt) > now : false
  }
  return false
}

/** After a paid period ends, Plus still works until graceEndsAt. */
export function graceEndsFromPeriod(periodEndsAt: Date, now = periodEndsAt): Date {
  const ends = new Date(periodEndsAt.getTime())
  ends.setUTCDate(ends.getUTCDate() + GRACE_DAYS)
  if (ends <= now) return now
  return ends
}

export function inFreeHistoryWindow(date: string, today: string): boolean {
  const start = addDays(today, -(FREE_HISTORY_DAYS - 1))
  return date >= start && date <= today
}

export function offerEligible({
  mutualReveals,
  active,
  snoozedUntil,
  now = new Date(),
}: {
  mutualReveals: number
  active: boolean
  snoozedUntil: string | null
  now?: Date
}): boolean {
  if (active) return false
  if (mutualReveals < OFFER_AFTER_REVEALS) return false
  if (snoozedUntil && new Date(snoozedUntil) > now) return false
  return true
}

export function trialEligible({
  mutualReveals,
  active,
  hasTrialed,
}: {
  mutualReveals: number
  active: boolean
  hasTrialed: boolean
}): boolean {
  return !active && !hasTrialed && mutualReveals >= OFFER_AFTER_REVEALS
}
