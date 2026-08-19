export type BadgeId = 'spark' | 'glow' | 'forge' | 'bond' | 'sync'

export type Badge = {
  id: BadgeId
  label: string
  description: string
  /** Short quest line shown while locked */
  quest: string
  glyph: string
  /** Streak days required; null = non-streak badge */
  streakTarget: number | null
}

export const BADGES: Badge[] = [
  {
    id: 'spark',
    label: 'Spark',
    description: 'Three days in a row — the habit starts.',
    quest: 'Check in 3 days in a row',
    glyph: '✧',
    streakTarget: 3,
  },
  {
    id: 'glow',
    label: 'Glow',
    description: 'A full week of showing up for each other.',
    quest: 'Reach a 7-day streak',
    glyph: '◈',
    streakTarget: 7,
  },
  {
    id: 'forge',
    label: 'Forge',
    description: 'Two weeks strong — the bond is taking shape.',
    quest: 'Reach a 14-day streak',
    glyph: '◉',
    streakTarget: 14,
  },
  {
    id: 'bond',
    label: 'Bond',
    description: 'Thirty days of choosing each other daily.',
    quest: 'Reach a 30-day streak',
    glyph: '◎',
    streakTarget: 30,
  },
  {
    id: 'sync',
    label: 'Sync',
    description: 'You both checked in the same day — first reveal.',
    quest: 'Both check in on the same day',
    glyph: '✦',
    streakTarget: null,
  },
]

export type BadgeProgress = {
  streak: number
  hasMutualReveal: boolean
  /** Days both partners checked in (revealed) */
  syncDays?: number
  /** Combined check-ins this year (yours + revealed partner) */
  togetherCount?: number
}

export function earnedBadgeIds(progress: BadgeProgress): BadgeId[] {
  const earned: BadgeId[] = []
  if (progress.streak >= 3) earned.push('spark')
  if (progress.streak >= 7) earned.push('glow')
  if (progress.streak >= 14) earned.push('forge')
  if (progress.streak >= 30) earned.push('bond')
  if (progress.hasMutualReveal) earned.push('sync')
  return earned
}

export function badgesForProgress(progress: BadgeProgress): Array<
  Badge & { earned: boolean }
> {
  const earned = new Set(earnedBadgeIds(progress))
  return BADGES.map((badge) => ({
    ...badge,
    earned: earned.has(badge.id),
  }))
}

/** Next streak badge still locked, if any */
export function nextStreakBadge(streak: number): Badge | null {
  const streakBadges = BADGES.filter((b) => b.streakTarget != null)
  return (
    streakBadges.find((b) => (b.streakTarget as number) > streak) ?? null
  )
}

export function streakProgressToward(
  streak: number,
  target: number,
): { current: number; target: number; remaining: number; ratio: number } {
  const current = Math.min(streak, target)
  return {
    current,
    target,
    remaining: Math.max(0, target - streak),
    ratio: target > 0 ? Math.min(1, streak / target) : 0,
  }
}
