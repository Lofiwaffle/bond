import { addDays, localDateString } from './dates'

export type Rhythm = {
  /** Days you checked in. Never goes down if you miss a day. */
  daysConnected: number
  /** Days you both opened. */
  daysOpen: number
  /** Recent check-ins, allowing a single missed day in between. */
  stretch: number
  lastDate: string | null
  /** 0 = today, 1 = yesterday, 2+ = longer gap. */
  gapDays: number
  welcomeBack: boolean
}

function dayDiff(earlier: string, later: string): number {
  const [ey, em, ed] = earlier.split('-').map(Number)
  const [ly, lm, ld] = later.split('-').map(Number)
  const a = Date.UTC(ey, em - 1, ed)
  const b = Date.UTC(ly, lm - 1, ld)
  return Math.round((b - a) / 86400000)
}

/**
 * Participation-first rhythm. Missing one day does not zero the stretch.
 * A longer absence does not erase days already connected.
 */
export function describeRhythm(
  myDates: string[],
  revealedDates: string[],
  today = localDateString(),
): Rhythm {
  const unique = [...new Set(myDates)].sort()
  const daysConnected = unique.length
  const daysOpen = new Set(revealedDates).size
  const lastDate = unique[unique.length - 1] ?? null

  if (!lastDate) {
    return {
      daysConnected: 0,
      daysOpen: 0,
      stretch: 0,
      lastDate: null,
      gapDays: 0,
      welcomeBack: false,
    }
  }

  const gapDays = Math.max(0, dayDiff(lastDate, today))
  const welcomeBack = gapDays >= 2
  const set = new Set(unique)
  let stretch = 1
  let cursor = lastDate

  while (true) {
    const prev = addDays(cursor, -1)
    if (set.has(prev)) {
      stretch += 1
      cursor = prev
      continue
    }
    const skipped = addDays(cursor, -2)
    if (set.has(skipped)) {
      stretch += 1
      cursor = skipped
      continue
    }
    break
  }

  return {
    daysConnected,
    daysOpen,
    stretch,
    lastDate,
    gapDays,
    welcomeBack,
  }
}

export function welcomeBackCopy(rhythm: Rhythm): string | null {
  if (!rhythm.welcomeBack || rhythm.daysConnected === 0) return null
  const days = rhythm.daysConnected
  return `Welcome back. The ${days} day${days === 1 ? '' : 's'} you already showed up still count.`
}
