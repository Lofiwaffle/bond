import { Platform } from 'react-native'

import { PLUS_PAID_CHECKOUT_READY, productById, type PlusProductId } from './bondPlus'

/**
 * Store checkout. Product IDs match App Store Connect / Play Billing.
 * Native IAP is off until PLUS_PAID_CHECKOUT_READY is true.
 */
export async function purchaseBondPlus(
  productId: PlusProductId,
): Promise<{ error: string | null }> {
  productById(productId)
  if (!PLUS_PAID_CHECKOUT_READY) {
    return {
      error:
        'Paid Bond Plus plans are not for sale in this release. The 14-day trial is free.',
    }
  }
  if (Platform.OS === 'web') {
    return {
      error:
        'Paid Bond Plus plans bill through the App Store or Play Store. You can start the 14-day trial here.',
    }
  }
  return {
    error:
      'Paid plans unlock when Bond Plus is listed on the App Store and Play Store. Start the 14-day trial meanwhile — one purchase will cover both of you.',
  }
}
