import AsyncStorage from '@react-native-async-storage/async-storage'

import { DAILY_OPEN_STORAGE_KEY } from './ads'

export async function readDailyOpenDay(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DAILY_OPEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export async function writeDailyOpenDay(day: string): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_OPEN_STORAGE_KEY, day)
  } catch {
    // Storage failure must not block the rest of the app.
  }
}
