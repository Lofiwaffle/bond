import { Platform } from 'react-native'

import {
  PLUS_NATIVE_CHECKOUT,
  PLUS_PAID_CHECKOUT_READY,
  PLUS_WEB_CHECKOUT,
  productById,
  type PlusProductId,
} from './bondPlus'

/**
 * Store checkout. Product IDs match App Store Connect / Play Billing:
 * bond_plus_monthly ($5.99) and bond_plus_annual ($60).
 * Native IAP completes after those products exist in a store build.
 */
export async function purchaseBondPlus(
  productId: PlusProductId,
): Promise<{ error: string | null }> {
  productById(productId)
  if (!PLUS_PAID_CHECKOUT_READY) {
    return {
      error: 'Paid Bond Plus plans are not for sale in this release.',
    }
  }
  if (Platform.OS === 'web') {
    return { error: PLUS_WEB_CHECKOUT }
  }
  return { error: PLUS_NATIVE_CHECKOUT }
}
