import { Platform } from 'react-native'

import {
  PLUS_FOUNDING_UNAVAILABLE,
  PLUS_PAID_CHECKOUT_READY,
  PLUS_WEB_CHECKOUT,
  productById,
  type CheckoutResult,
  type PlusProductId,
} from './bondPlus'
import { restoreStorePurchases, startStorePurchase } from './storeBilling'
import { supabase } from './supabase'

export type { CheckoutResult }

/**
 * Store checkout. Product IDs match App Store Connect / Play Billing:
 * bond_plus_monthly ($5.99) and bond_plus_annual ($60).
 */
export async function purchaseBondPlus(
  productId: PlusProductId,
): Promise<CheckoutResult> {
  productById(productId)
  if (productId === 'bond_plus_founding_annual') {
    return { error: PLUS_FOUNDING_UNAVAILABLE, completed: false }
  }
  if (!PLUS_PAID_CHECKOUT_READY) {
    return {
      error: 'Paid Bond Plus plans are not for sale in this release.',
      completed: false,
    }
  }
  if (Platform.OS === 'web') {
    return { error: PLUS_WEB_CHECKOUT, completed: false }
  }
  return startStorePurchase(productId)
}

export async function restoreBondPlus(): Promise<{ error: string | null }> {
  if (Platform.OS !== 'web') {
    const store = await restoreStorePurchases()
    if (store.claimed) return { error: null }
    const { error } = await supabase.rpc('restore_plus')
    if (!error) return { error: null }
    return { error: store.error ?? error.message }
  }

  const { error } = await supabase.rpc('restore_plus')
  return { error: error?.message ?? null }
}
