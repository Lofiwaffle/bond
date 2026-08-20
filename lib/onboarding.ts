import AsyncStorage from '@react-native-async-storage/async-storage'

const ONBOARDING_SEEN_KEY = 'bond.onboarding.seen'

export async function hasSeenOnboarding(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
  return value === 'true'
}

export async function markOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true')
}

export async function clearOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_SEEN_KEY)
}
