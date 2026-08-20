import type { IconName } from './icons'

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
  icon: IconName
}

export const ACTIVITIES: Activity[] = [
  { id: 'sports', label: 'Sports', icon: 'activity' },
  { id: 'work', label: 'Work', icon: 'briefcase' },
  { id: 'food', label: 'Food', icon: 'coffee' },
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'social', label: 'Social', icon: 'message-circle' },
  { id: 'rest', label: 'Rest', icon: 'moon' },
  { id: 'travel', label: 'Travel', icon: 'navigation' },
  { id: 'other', label: 'Other', icon: 'more-horizontal' },
]

export const ACTIVITY_IDS = ACTIVITIES.map((a) => a.id) as ActivityId[]

export const MAX_ACTIVITIES = 5

export function isActivityId(value: string): value is ActivityId {
  return (ACTIVITY_IDS as string[]).includes(value)
}

export function activityById(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id)
}
