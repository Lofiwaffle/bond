import type { IconName } from './icons'

export type BadgeId = 'spark' | 'glow' | 'forge' | 'bond' | 'sync'

export type Badge = {
  id: BadgeId
  label: string
  icon: IconName
  /** What this badge means, shown once earned */
  description: string
  /** Call to action shown to encourage logging, locked or unlocked */
  quest: string
  /** Full intensity color for calendar squares */
  color: string
  /** Soft / low-intensity square fill */
  colorSoft: string
}

export const BADGES: Badge[] = [
  {
    id: 'spark',
    label: 'Spark',
    icon: 'zap',
    description: 'Trying something new that reignites excitement.',
    quest: 'Log a new experience or adventure you tried together',
    color: '#C9B8BE',
    colorSoft: '#EDE6E8',
  },
  {
    id: 'glow',
    label: 'Glow',
    icon: 'sun',
    description: 'Publicly celebrating or showing off the relationship.',
    quest: 'Log a time you celebrated together',
    color: '#A8989E',
    colorSoft: '#E4DCDF',
  },
  {
    id: 'forge',
    label: 'Forge',
    icon: 'tool',
    description: 'Strengthening the relationship materially or financially.',
    quest: "Log something you've built or created together.",
    color: '#8A7C82',
    colorSoft: '#D8CFD3',
  },
  {
    id: 'bond',
    label: 'Bond',
    icon: 'heart',
    description: 'Spending real shared quality time together.',
    quest:
      'Log a quality bonding moment: a meal, walk, undistracted time, or an adventure',
    color: '#6E6167',
    colorSoft: '#C9B8BE',
  },
  {
    id: 'sync',
    label: 'Sync',
    icon: 'refresh-cw',
    description: 'A State of the Union talk, deeper than the daily check-in.',
    quest:
      'Log a deliberate conversation about how the relationship is really going',
    color: '#3D2C33',
    colorSoft: '#B9AEB3',
  },
]

export type BadgeProgress = {
  completions: Record<BadgeId, number>
}

export function earnedBadgeIds(progress: BadgeProgress): BadgeId[] {
  return BADGES.filter((b) => (progress.completions[b.id] ?? 0) > 0).map(
    (b) => b.id,
  )
}

export function badgesForProgress(
  progress: BadgeProgress,
): Array<Badge & { earned: boolean; count: number }> {
  return BADGES.map((badge) => {
    const count = progress.completions[badge.id] ?? 0
    return {
      ...badge,
      count,
      earned: count > 0,
    }
  })
}

/** Local YYYY-MM-DD from a timestamptz / ISO string */
export function habitLocalDate(iso: string): string {
  const d = new Date(iso)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * GitHub-style week columns (Sun→Sat rows), ending on the week that
 * contains `end` (default today). Returns `weekCount` columns.
 */
export function habitCalendarWeeks(
  weekCount = 13,
  end: Date = new Date(),
): string[][] {
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  const endDow = endDay.getDay() // 0=Sun
  const lastSaturday = new Date(endDay)
  lastSaturday.setDate(endDay.getDate() + (6 - endDow))

  const totalDays = weekCount * 7
  const first = new Date(lastSaturday)
  first.setDate(lastSaturday.getDate() - (totalDays - 1))

  const weeks: string[][] = []
  for (let w = 0; w < weekCount; w++) {
    const week: string[] = []
    for (let d = 0; d < 7; d++) {
      const cell = new Date(first)
      cell.setDate(first.getDate() + w * 7 + d)
      const y = cell.getFullYear()
      const m = String(cell.getMonth() + 1).padStart(2, '0')
      const day = String(cell.getDate()).padStart(2, '0')
      week.push(`${y}-${m}-${day}`)
    }
    weeks.push(week)
  }
  return weeks
}

/** Per-habit, per-day completion counts for calendar coloring */
export function habitDayCounts(
  completions: Array<{ habit_id: string; created_at: string }>,
): Record<BadgeId, Record<string, number>> {
  const out: Record<BadgeId, Record<string, number>> = {
    spark: {},
    glow: {},
    forge: {},
    bond: {},
    sync: {},
  }
  for (const row of completions) {
    const id = row.habit_id as BadgeId
    if (!(id in out)) continue
    const day = habitLocalDate(row.created_at)
    out[id][day] = (out[id][day] ?? 0) + 1
  }
  return out
}

export type HabitDaySummary = {
  /** Habit with the most logs that day (BADGES order breaks ties) */
  primary: BadgeId | null
  /** Distinct habits logged that day */
  habits: BadgeId[]
  /** Total completions across all habits */
  total: number
}

/** Combined per-day summary for a single shared calendar */
export function habitCombinedDaySummary(
  dayCounts: Record<BadgeId, Record<string, number>>,
  date: string,
): HabitDaySummary {
  let primary: BadgeId | null = null
  let primaryCount = 0
  const habits: BadgeId[] = []
  let total = 0

  for (const badge of BADGES) {
    const n = dayCounts[badge.id][date] ?? 0
    if (n <= 0) continue
    habits.push(badge.id)
    total += n
    if (n > primaryCount) {
      primary = badge.id
      primaryCount = n
    }
  }

  return { primary, habits, total }
}
