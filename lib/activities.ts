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
  tint: string
}

export const ACTIVITIES: Activity[] = [
  { id: 'sports', label: 'Sports', glyph: '🏃', tint: '#FFE0D4' },
  { id: 'work', label: 'Work', glyph: '💼', tint: '#DCE6FF' },
  { id: 'food', label: 'Food', glyph: '🍽', tint: '#FFF0C4' },
  { id: 'home', label: 'Home', glyph: '🏠', tint: '#E8D9F5' },
  { id: 'social', label: 'Social', glyph: '💬', tint: '#FFD6E5' },
  { id: 'rest', label: 'Rest', glyph: '🌙', tint: '#D5F1EC' },
  { id: 'travel', label: 'Travel', glyph: '✈', tint: '#D4ECF8' },
  { id: 'other', label: 'Other', glyph: '✦', tint: '#FFE4D1' },
]

export const ACTIVITY_IDS = ACTIVITIES.map((a) => a.id) as ActivityId[]

export const MAX_ACTIVITIES = 5

export function isActivityId(value: string): value is ActivityId {
  return (ACTIVITY_IDS as string[]).includes(value)
}

export function activityById(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id)
}
