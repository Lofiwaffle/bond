import AsyncStorage from '@react-native-async-storage/async-storage'

const ONBOARDING_SEEN_KEY = 'bond.onboarding.seen.v2'

let seenMemory: boolean | null = null

export function rememberedOnboardingSeen(): boolean | null {
  return seenMemory
}

export async function hasSeenOnboarding(): Promise<boolean> {
  if (seenMemory === true) return true
  const value = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
  seenMemory = value === 'true'
  return seenMemory
}

export async function markOnboardingSeen(): Promise<void> {
  seenMemory = true
  await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true')
}

export async function clearOnboarding(): Promise<void> {
  seenMemory = false
  await AsyncStorage.removeItem(ONBOARDING_SEEN_KEY)
}
