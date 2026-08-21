import { Redirect } from 'expo-router'

/** Habits were renamed to Achievements. */
export default function HabitsRedirect() {
  return <Redirect href="/(app)/bond/achievements" />
}
