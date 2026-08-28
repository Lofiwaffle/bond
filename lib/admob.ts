import type { AdmobModule } from './admobTypes'

/** Web fallback — no native AdMob module. Type matches the native adapter. */

export function getAdmob(): AdmobModule | null {
  return null
}

export async function showDailyInterstitial(): Promise<boolean> {
  return false
}
