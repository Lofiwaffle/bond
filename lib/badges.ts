export type BadgeId = 'spark' | 'glow' | 'forge' | 'bond' | 'sync'

export type Badge = {
  id: BadgeId
  label: string
  description: string
  glyph: string
}

export const BADGES: Badge[] = [
  {
    id: 'spark',
    label: 'Spark',
    description: '3-day check-in streak',
    glyph: '✦',
  },
  {
    id: 'glow',
    label: 'Glow',
    description: '7-day check-in streak',
    glyph: '✧',
  },
  {
    id: 'forge',
    label: 'Forge',
    description: '14-day check-in streak',
    glyph: '◈',
  },
  {
    id: 'bond',
    label: 'Bond',
    description: '30-day check-in streak',
    glyph: '◉',
  },
  {
    id: 'sync',
    label: 'Sync',
    description: 'First mutual reveal day',
    glyph: '◎',
  },
]

export type BadgeProgress = {
  streak: number
  hasMutualReveal: boolean
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
