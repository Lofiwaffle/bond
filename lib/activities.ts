export type ActivityId =
  | 'sports'
  | 'work'
  | 'food'
  | 'home'
  | 'social'
  | 'rest'
  | 'travel'
  | 'other'

export type Activity = {
  id: ActivityId
  label: string
  glyph: string
}

export const ACTIVITIES: Activity[] = [
  { id: 'sports', label: 'Sports', glyph: '🏃' },
  { id: 'work', label: 'Work', glyph: '💼' },
  { id: 'food', label: 'Food', glyph: '🍽' },
  { id: 'home', label: 'Home', glyph: '🏠' },
  { id: 'social', label: 'Social', glyph: '💬' },
  { id: 'rest', label: 'Rest', glyph: '🌙' },
  { id: 'travel', label: 'Travel', glyph: '✈' },
  { id: 'other', label: 'Other', glyph: '✦' },
]

export const ACTIVITY_IDS = ACTIVITIES.map((a) => a.id) as ActivityId[]

export const MAX_ACTIVITIES = 5

export function isActivityId(value: string): value is ActivityId {
  return (ACTIVITY_IDS as string[]).includes(value)
}

export function activityById(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id)
}
