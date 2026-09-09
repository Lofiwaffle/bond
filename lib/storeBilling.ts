import { PLUS_WEB_CHECKOUT, type CheckoutResult, type PlusProductId } from './bondPlus'

/** Web: paid checkout only completes in the native Bond app. */

export async function startStorePurchase(
  _productId: PlusProductId,
): Promise<CheckoutResult> {
  return { error: PLUS_WEB_CHECKOUT, completed: false }
}

export async function restoreStorePurchases(): Promise<{
  error: string | null
  claimed: boolean
}> {
  return { error: null, claimed: false }
}
