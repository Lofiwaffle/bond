import { addDays } from './dates'

export const OBSERVATION_MIN_REVEALED = 14
export const COUNT_MIN_DAYS = 3
export const SIMILAR_MAX_GAP = 1
export const MEANINGFUL_MIN_GAP = 2
export const CONNECTED_AVG = 4
export const ACTIVITY_MIN_CONNECTED_DAYS = 4
export const ACTIVITY_MIN_LIFT = 0.2
export const WINDOW_DAYS = 30
export const WINDOW_MIN_REVEALED = 5
export const WINDOW_MIN_DELTA = 0.4

const ACTIVITY_LABELS: Record<string, string> = {
  sports: 'Sports',
  work: 'Work',
  food: 'Food',
  home: 'Home',
  social: 'Social',
  rest: 'Rest',
  travel: 'Travel',
  other: 'Other',
}

export type ObservationDay = {
  date: string
  mine: number
  partner: number
  activities: string[]
}

export type GrowthObservation = {
  id: 'similar' | 'difference' | 'activities' | 'window'
  body: string
}

export const OBSERVATION_DISCLAIMER =
  'These are patterns in labels you both saved, not a diagnosis of the relationship.'

function uniqueSorted(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => id in ACTIVITY_LABELS))].sort()
}

function coupleAverage(day: ObservationDay): number {
  return (day.mine + day.partner) / 2
}

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function formatActivityList(ids: string[]): string {
  const labels = ids.map((id) => ACTIVITY_LABELS[id] ?? id)
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

export function observationDaysFromIndex(
  days: {
    date: string
    mineScore: number | null
    partnerScore: number | null
    revealed: boolean
    activities?: string[]
  }[],
): ObservationDay[] {
  const revealed: ObservationDay[] = []
  for (const day of days) {
    if (
      !day.revealed ||
      typeof day.mineScore !== 'number' ||
      typeof day.partnerScore !== 'number'
    ) {
      continue
    }
    revealed.push({
      date: day.date,
      mine: day.mineScore,
      partner: day.partnerScore,
      activities: day.activities ?? [],
    })
  }
  return revealed
}

export function buildGrowthObservations(
  days: ObservationDay[],
  today: string,
): GrowthObservation[] {
  const revealed = days
    .filter(
      (day) =>
        day.mine >= 1 &&
        day.mine <= 5 &&
        day.partner >= 1 &&
        day.partner <= 5,
    )
    .map((day) => ({
      ...day,
      activities: uniqueSorted(day.activities),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (revealed.length < OBSERVATION_MIN_REVEALED) return []

  const observations: GrowthObservation[] = []
  const similarCount = revealed.filter(
    (day) => Math.abs(day.mine - day.partner) <= SIMILAR_MAX_GAP,
  ).length
  if (similarCount >= COUNT_MIN_DAYS) {
    observations.push({
      id: 'similar',
      body: `We noticed you both chose a similar connection label on ${similarCount} of ${revealed.length} opened days.`,
    })
  }

  const differenceCount = revealed.filter(
    (day) => Math.abs(day.mine - day.partner) >= MEANINGFUL_MIN_GAP,
  ).length
  if (differenceCount >= COUNT_MIN_DAYS) {
    observations.push({
      id: 'difference',
      body: `We noticed a wider gap between your labels on ${differenceCount} of ${revealed.length} opened days.`,
    })
  }

  const connected = revealed.filter((day) => coupleAverage(day) >= CONNECTED_AVG)
  const taggedConnected = connected.filter((day) => day.activities.length > 0)
  const taggedRevealed = revealed.filter((day) => day.activities.length > 0)
  if (
    taggedConnected.length >= ACTIVITY_MIN_CONNECTED_DAYS &&
    taggedRevealed.length >= ACTIVITY_MIN_CONNECTED_DAYS
  ) {
    const lifted: { id: string; hits: number; lift: number }[] = []
    for (const id of Object.keys(ACTIVITY_LABELS).sort()) {
      const connectedHits = taggedConnected.filter((day) =>
        day.activities.includes(id),
      ).length
      const overallHits = taggedRevealed.filter((day) =>
        day.activities.includes(id),
      ).length
      if (connectedHits < ACTIVITY_MIN_CONNECTED_DAYS) continue
      const connectedRate = connectedHits / taggedConnected.length
      const overallRate = overallHits / taggedRevealed.length
      const lift = connectedRate - overallRate
      if (lift >= ACTIVITY_MIN_LIFT) {
        lifted.push({ id, hits: connectedHits, lift })
      }
    }
    lifted.sort((a, b) => {
      if (b.hits !== a.hits) return b.hits - a.hits
      if (b.lift !== a.lift) return b.lift - a.lift
      return a.id.localeCompare(b.id)
    })
    const top = lifted.slice(0, 2).map((item) => item.id)
    if (top.length > 0) {
      observations.push({
        id: 'activities',
        body: `We noticed ${formatActivityList(top)} showed up more often on days you both labeled more connected.`,
      })
    }
  }

  const lastStart = addDays(today, -(WINDOW_DAYS - 1))
  const prevEnd = addDays(today, -WINDOW_DAYS)
  const prevStart = addDays(today, -(WINDOW_DAYS * 2 - 1))
  const lastWindow = revealed.filter((day) => inRange(day.date, lastStart, today))
  const prevWindow = revealed.filter((day) =>
    inRange(day.date, prevStart, prevEnd),
  )
  if (
    lastWindow.length >= WINDOW_MIN_REVEALED &&
    prevWindow.length >= WINDOW_MIN_REVEALED
  ) {
    const lastMean = mean(lastWindow.map(coupleAverage))
    const prevMean = mean(prevWindow.map(coupleAverage))
    const delta = lastMean - prevMean
    if (delta >= WINDOW_MIN_DELTA) {
      observations.push({
        id: 'window',
        body: 'We noticed opened days in the last 30 days were labeled a little more connected than the 30 days before that.',
      })
    } else if (delta <= -WINDOW_MIN_DELTA) {
      observations.push({
        id: 'window',
        body: 'We noticed opened days in the last 30 days were labeled a little less connected than the 30 days before that.',
      })
    }
  }

  return observations
}
