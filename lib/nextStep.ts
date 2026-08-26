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
  id: 'weekly' | 'patterns' | 'goals' | 'achievements'
  title: string
  body: string
  href:
    | '/(app)/weekly-review'
    | '/(app)/bond/streaks'
    | '/(app)/bond/goals'
    | '/(app)/bond/achievements'
    | '/(app)/bond/reviews'
}

export function pickGrowthNext({
  unlocks,
  needsReview,
  activeGoalCount,
  myCheckIns,
}: {
  unlocks: GrowthUnlocks
  needsReview: boolean
  activeGoalCount: number
  myCheckIns: number
}): { next: GrowthDestination | null; remaining: number } {
  if (unlocks.weeklyReview && needsReview) {
    return {
      next: {
        id: 'weekly',
        title: 'Weekly review',
        body: 'Look back in your own words, then pick one small intention.',
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
        body: 'Name one shared aim now that you have a rhythm.',
        href: '/(app)/bond/goals',
      },
      remaining: 0,
    }
  }

  return {
    next: {
      id: 'patterns',
      title: 'Rhythm',
      body: 'Days connected, without a punishment for missing one.',
      href: '/(app)/bond/streaks',
    },
    remaining: 0,
  }
}

export function unlockedGrowthItems(unlocks: GrowthUnlocks): GrowthDestination[] {
  const items: GrowthDestination[] = []
  if (unlocks.patterns) {
    items.push({
      id: 'patterns',
      title: 'Rhythm',
      body: 'Days connected',
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
      title: 'Milestones',
      body: 'Constructive moments you already lived',
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
  return items
}
