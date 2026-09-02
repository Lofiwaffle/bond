import { OBSERVATION_MIN_REVEALED } from './growthObservations'

export type TodayPhase = 'compose' | 'waiting' | 'reveal'

export function todayPhase({
  hasMine,
  waitingForPartner,
  bothSubmitted,
}: {
  hasMine: boolean
  waitingForPartner: boolean
  bothSubmitted: boolean
}): TodayPhase {
  if (bothSubmitted) return 'reveal'
  if (waitingForPartner || hasMine) return 'waiting'
  return 'compose'
}

export type GrowthUnlocks = {
  patterns: boolean
  achievements: boolean
  goals: boolean
  weeklyReview: boolean
}

/** Advanced Growth surfaces stay quiet until there is enough shared activity. */
export function growthUnlocks({
  myCheckIns,
  revealedDays,
  weeklyUnlocked,
}: {
  myCheckIns: number
  revealedDays: number
  weeklyUnlocked: boolean
}): GrowthUnlocks {
  return {
    patterns: myCheckIns >= 3,
    achievements: revealedDays >= 1 || myCheckIns >= 3,
    goals: revealedDays >= 3 || myCheckIns >= 7,
    weeklyReview: weeklyUnlocked,
  }
}

export type GrowthDestination = {
  id: 'weekly' | 'reviews' | 'patterns' | 'goals' | 'achievements' | 'prompts'
  title: string
  body: string
  href:
    | '/(app)/weekly-review'
    | '/(app)/bond/streaks'
    | '/(app)/bond/goals'
    | '/(app)/bond/achievements'
    | '/(app)/bond/reviews'
    | '/(app)/bond/prompts'
}

/** Always-visible Bond hub. Paid checkout is off, so these stay reachable. */
export function bondHubItems(): GrowthDestination[] {
  return [
    {
      id: 'achievements',
      title: 'Achievements',
      body: 'Calendar and notes you log together',
      href: '/(app)/bond/achievements',
    },
    {
      id: 'prompts',
      title: 'Prompts',
      body: 'Questions only the two of you see',
      href: '/(app)/bond/prompts',
    },
    {
      id: 'goals',
      title: 'Goals',
      body: 'Shared aims',
      href: '/(app)/bond/goals',
    },
    {
      id: 'patterns',
      title: 'Rhythm',
      body: 'Days connected',
      href: '/(app)/bond/streaks',
    },
    {
      id: 'weekly',
      title: 'Weekly review',
      body: 'Look back on the week together',
      href: '/(app)/weekly-review',
    },
    {
      id: 'reviews',
      title: 'Reviews',
      body: 'Past weekly summaries',
      href: '/(app)/bond/reviews',
    },
  ]
}

function rhythmBody(revealedDays: number): string {
  return revealedDays >= OBSERVATION_MIN_REVEALED
    ? 'Opened days, similar labels, and quiet patterns — not a verdict.'
    : 'Days connected, without a punishment for missing one.'
}

export function pickGrowthNext({
  unlocks,
  needsReview,
  activeGoalCount,
  myCheckIns,
  revealedDays = 0,
}: {
  unlocks: GrowthUnlocks
  needsReview: boolean
  activeGoalCount: number
  myCheckIns: number
  revealedDays?: number
}): { next: GrowthDestination | null; remaining: number } {
  if (unlocks.weeklyReview && needsReview) {
    return {
      next: {
        id: 'weekly',
        title: 'Weekly review',
        body: 'Look back at last week in your own words, then pick one small intention.',
        href: '/(app)/weekly-review',
      },
      remaining: 0,
    }
  }

  if (!unlocks.patterns) {
    return {
      next: null,
      remaining: Math.max(0, 3 - myCheckIns),
    }
  }

  if (unlocks.goals && activeGoalCount === 0) {
    return {
      next: {
        id: 'goals',
        title: 'Goals',
        body: 'Offer a shared aim. It becomes yours together after they agree.',
        href: '/(app)/bond/goals',
      },
      remaining: 0,
    }
  }

  return {
    next: {
      id: 'patterns',
      title: 'Rhythm',
      body: rhythmBody(revealedDays),
      href: '/(app)/bond/streaks',
    },
    remaining: 0,
  }
}

export function daysUntilFirstLook(myCheckIns: number): number {
  return Math.max(0, 3 - myCheckIns)
}

export type WeeklyInsight = {
  kicker: string
  title: string
  body: string
  actionLabel?: string
  href?: GrowthDestination['href'] | '/(app)/(tabs)'
}

/** One weekly reading for Growth home. Tools live in the hub. */
export function pickWeeklyInsight({
  needsReview,
  insightTitle,
  insightBody,
  remaining,
}: {
  needsReview: boolean
  insightTitle: string | null
  insightBody: string | null
  remaining: number
}): WeeklyInsight {
  if (needsReview) {
    return {
      kicker: 'This week',
      title: 'Weekly review',
      body: 'Look back at last week in your own words, then pick one small intention.',
      actionLabel: 'Open weekly review',
      href: '/(app)/weekly-review',
    }
  }
  if (insightBody) {
    return {
      kicker: 'This week',
      title: insightTitle ?? 'A first look',
      body: insightBody,
    }
  }
  return {
    kicker: 'Not yet',
    title: 'A weekly look opens after a few check-ins.',
    body:
      remaining > 0
        ? `${remaining} more day${remaining === 1 ? '' : 's'} on Today, then a first look appears here.`
        : 'Keep the daily ritual. This page stays quiet until it can help.',
    actionLabel: 'Go to Today',
    href: '/(app)/(tabs)',
  }
}

export function unlockedGrowthItems(
  unlocks: GrowthUnlocks,
  { revealedDays = 0 }: { revealedDays?: number } = {},
): GrowthDestination[] {
  const items: GrowthDestination[] = []
  if (unlocks.patterns) {
    items.push({
      id: 'patterns',
      title: 'Rhythm',
      body:
        revealedDays >= OBSERVATION_MIN_REVEALED
          ? 'What you both labeled, without a verdict'
          : 'Days connected',
      href: '/(app)/bond/streaks',
    })
  }
  if (unlocks.goals) {
    items.push({
      id: 'goals',
      title: 'Goals',
      body: 'Shared aims',
      href: '/(app)/bond/goals',
    })
  }
  if (unlocks.achievements) {
    items.push({
      id: 'achievements',
      title: 'Achievements',
      body: 'Calendar and notes you log together',
      href: '/(app)/bond/achievements',
    })
  }
  if (unlocks.weeklyReview) {
    items.push({
      id: 'weekly',
      title: 'Weekly review',
      body: 'A look back together',
      href: '/(app)/bond/reviews',
    })
  }
  if (unlocks.patterns) {
    items.push({
      id: 'prompts',
      title: 'Private prompts',
      body: 'Questions only the two of you see',
      href: '/(app)/bond/prompts',
    })
  }
  return items
}
