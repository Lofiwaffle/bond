import Constants from 'expo-constants'
import { Platform } from 'react-native'

import {
  PLUS_EXPO_GO_CHECKOUT,
  PLUS_NATIVE_CHECKOUT,
  PLUS_STORE_SKUS,
  isPaidStoreSku,
  storeNameForPlatform,
  storePeriodEnd,
  type CheckoutResult,
  type PlusProductId,
} from './bondPlus'
import { supabase } from './supabase'

type ExpoIap = typeof import('expo-iap')
type StorePurchase = import('expo-iap').Purchase
type StoreSubscription = import('expo-iap').ProductSubscription

let iapModule: ExpoIap | null | undefined
let connection: Promise<boolean> | null = null

function loadIap(): ExpoIap | null {
  if (iapModule !== undefined) return iapModule
  try {
    // Expo Go has no native billing module; a static import would crash there.
    iapModule = require('expo-iap') as ExpoIap
  } catch {
    iapModule = null
  }
  return iapModule
}

function isExpoGo(): boolean {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === 'storeClient'
  )
}

async function ensureConnection(iap: ExpoIap): Promise<boolean> {
  if (!connection) {
    connection = iap.initConnection().catch((error: unknown) => {
      connection = null
      throw error
    })
  }
  return connection
}

function purchaseMatchesSku(purchase: StorePurchase, sku: string): boolean {
  if (purchase.productId === sku) return true
  return (purchase.ids ?? []).includes(sku)
}

function androidOfferToken(product: StoreSubscription): string | null {
  const offers = product.subscriptionOffers ?? []
  if (!offers.length) return null
  const trial = offers.find((offer) => offer.paymentMode === 'free-trial')
  const chosen = trial ?? offers[0]
  return chosen.offerTokenAndroid ?? null
}

function waitForPurchase(
  iap: ExpoIap,
  sku: string,
  timeoutMs = 120_000,
): { promise: Promise<StorePurchase>; cancel: () => void } {
  let cleanup = () => {}
  const promise = new Promise<StorePurchase>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('Store checkout timed out. Try again.'))
    }, timeoutMs)

    const success = iap.purchaseUpdatedListener((purchase) => {
      if (!purchaseMatchesSku(purchase, sku)) return
      cleanup()
      resolve(purchase)
    })
    const fail = iap.purchaseErrorListener((error) => {
      cleanup()
      reject(error)
    })

    cleanup = () => {
      clearTimeout(timer)
      success.remove()
      fail.remove()
    }
  })
  return { promise, cancel: () => cleanup() }
}

function isIosPurchase(
  purchase: StorePurchase,
): purchase is import('expo-iap').PurchaseIOS {
  return purchase.store === 'apple' || 'expirationDateIOS' in purchase
}

function isAndroidPurchase(
  purchase: StorePurchase,
): purchase is import('expo-iap').PurchaseAndroid {
  return purchase.store === 'google' || 'isAcknowledgedAndroid' in purchase
}

function isCancelled(error: unknown, iap: ExpoIap): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  return String((error as { code?: string }).code) === iap.ErrorCode.UserCancelled
}

function originalTransactionId(purchase: StorePurchase): string {
  if (isIosPurchase(purchase)) {
    return (
      purchase.originalTransactionIdentifierIOS ||
      purchase.transactionId ||
      purchase.id
    )
  }
  return purchase.transactionId || purchase.purchaseToken || purchase.id
}

function latestTransactionId(purchase: StorePurchase): string {
  if (isIosPurchase(purchase)) {
    return purchase.transactionId || purchase.id
  }
  return purchase.purchaseToken || purchase.transactionId || purchase.id
}

function expiresAtIso(purchase: StorePurchase, productId: PlusProductId): string {
  if (isIosPurchase(purchase) && purchase.expirationDateIOS) {
    return new Date(purchase.expirationDateIOS).toISOString()
  }
  return storePeriodEnd(productId).toISOString()
}

async function claimPurchase(
  purchase: StorePurchase,
  productId: PlusProductId,
): Promise<{ error: string | null }> {
  if (purchase.purchaseState === 'pending') {
    return {
      error: 'This purchase is still pending. Bond Plus will unlock when it completes.',
    }
  }
  if (isAndroidPurchase(purchase) && purchase.isSuspendedAndroid) {
    return {
      error: 'This subscription needs attention in Google Play before Bond Plus can stay on.',
    }
  }

  const store = storeNameForPlatform(Platform.OS)
  if (!store) {
    return { error: PLUS_NATIVE_CHECKOUT }
  }

  const { error } = await supabase.rpc('claim_plus_store_purchase', {
    p_product_id: productId,
    p_store: store,
    p_original_transaction_id: originalTransactionId(purchase),
    p_latest_transaction_id: latestTransactionId(purchase),
    p_expires_at: expiresAtIso(purchase, productId),
  })
  if (error) return { error: error.message }
  return { error: null }
}

async function finishIfPossible(iap: ExpoIap, purchase: StorePurchase) {
  try {
    await iap.finishTransaction({ purchase, isConsumable: false })
  } catch {
    // Leave unfinished so restore can retry acknowledgment.
  }
}

export async function startStorePurchase(
  productId: PlusProductId,
): Promise<CheckoutResult> {
  if (!isPaidStoreSku(productId)) {
    return { error: 'That Bond Plus plan is not for sale.', completed: false }
  }
  if (isExpoGo()) {
    return { error: PLUS_EXPO_GO_CHECKOUT, completed: false }
  }

  const iap = loadIap()
  if (!iap) {
    return { error: PLUS_EXPO_GO_CHECKOUT, completed: false }
  }

  try {
    await ensureConnection(iap)
    const products = (await iap.fetchProducts({
      skus: [...PLUS_STORE_SKUS],
      type: 'subs',
    })) as StoreSubscription[] | null
    const product = (products ?? []).find((item) => item.id === productId)
    if (!product) {
      return { error: PLUS_NATIVE_CHECKOUT, completed: false }
    }

    const googleOffer =
      Platform.OS === 'android' ? androidOfferToken(product) : null
    if (Platform.OS === 'android' && !googleOffer) {
      return { error: PLUS_NATIVE_CHECKOUT, completed: false }
    }

    const pending = waitForPurchase(iap, productId)

    try {
      await iap.requestPurchase({
        type: 'subs',
        request: {
          apple: { sku: productId },
          google: {
            skus: [productId],
            subscriptionOffers: googleOffer
              ? [{ sku: productId, offerToken: googleOffer }]
              : [],
          },
        },
      })

      const purchase = await pending.promise
      const claimed = await claimPurchase(purchase, productId)
      if (!claimed.error) {
        await finishIfPossible(iap, purchase)
        return { error: null, completed: true }
      }
      return { error: claimed.error, completed: false }
    } catch (error) {
      pending.cancel()
      throw error
    }
  } catch (error) {
    if (isCancelled(error, iap)) {
      return { error: null, completed: false }
    }
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code)
        : ''
    if (code === iap.ErrorCode.AlreadyOwned || code === 'already-owned') {
      return restoreStorePurchases().then((result) =>
        result.claimed
          ? { error: null, completed: true }
          : { error: result.error, completed: false },
      )
    }
    if (code === iap.ErrorCode.ItemUnavailable || code === 'item-unavailable') {
      return { error: PLUS_NATIVE_CHECKOUT, completed: false }
    }
    const message = error instanceof Error ? error.message : PLUS_NATIVE_CHECKOUT
    if (
      code === iap.ErrorCode.IapNotAvailable ||
      code === iap.ErrorCode.InitConnection ||
      code === iap.ErrorCode.NotPrepared ||
      /native module/i.test(message)
    ) {
      return { error: PLUS_EXPO_GO_CHECKOUT, completed: false }
    }
    return { error: message || PLUS_NATIVE_CHECKOUT, completed: false }
  }
}

export async function restoreStorePurchases(): Promise<{
  error: string | null
  claimed: boolean
}> {
  if (isExpoGo()) {
    return { error: PLUS_EXPO_GO_CHECKOUT, claimed: false }
  }

  const iap = loadIap()
  if (!iap) {
    return { error: PLUS_EXPO_GO_CHECKOUT, claimed: false }
  }

  try {
    await ensureConnection(iap)
    await iap.restorePurchases()
    const purchases = await iap.getAvailablePurchases()
    let claimed = false
    let lastError: string | null = null

    for (const purchase of purchases ?? []) {
      if (!isPaidStoreSku(purchase.productId)) continue
      const result = await claimPurchase(purchase, purchase.productId)
      if (result.error) {
        lastError = result.error
        continue
      }
      claimed = true
      await finishIfPossible(iap, purchase)
    }

    if (claimed) return { error: null, claimed: true }
    return {
      error: lastError ?? 'No Bond Plus purchase on this store account.',
      claimed: false,
    }
  } catch (error) {
    if (isCancelled(error, iap)) {
      return { error: null, claimed: false }
    }
    const message =
      error instanceof Error ? error.message : 'Could not restore from the store.'
    return { error: message, claimed: false }
  }
}
