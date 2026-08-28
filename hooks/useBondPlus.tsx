import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { useAuth } from '../lib/auth'
import {
  BOND_PLUS_ENTITLEMENT,
  type PlusFunnelEvent,
  type PlusPlan,
  type PlusProductId,
} from '../lib/bondPlus'
import { reportError } from '../lib/monitor'
import { isPlusActive, type PlusLifecycle } from '../lib/plusAccess'
import { purchaseBondPlus } from '../lib/purchases'
import { supabase } from '../lib/supabase'

export type PlusStatus = {
  entitlement: typeof BOND_PLUS_ENTITLEMENT
  status: PlusLifecycle
  plan: PlusPlan | null
  active: boolean
  purchaserId: string | null
  isPurchaser: boolean
  trialEndsAt: string | null
  periodEndsAt: string | null
  graceEndsAt: string | null
  mutualReveals: number
  foundingSlotsRemaining: number
  trialEligible: boolean
  offerEligible: boolean
  restoreAvailable: boolean
  hasTrialed: boolean
}

const EMPTY: PlusStatus = {
  entitlement: BOND_PLUS_ENTITLEMENT,
  status: 'none',
  plan: null,
  active: false,
  purchaserId: null,
  isPurchaser: false,
  trialEndsAt: null,
  periodEndsAt: null,
  graceEndsAt: null,
  mutualReveals: 0,
  foundingSlotsRemaining: 250,
  trialEligible: false,
  offerEligible: false,
  restoreAvailable: false,
  hasTrialed: false,
}

type PlusContextValue = PlusStatus & {
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  startTrial: () => Promise<{ error: string | null }>
  restore: () => Promise<{ error: string | null }>
  snoozeOffer: () => Promise<void>
  markPreviewViewed: () => Promise<void>
  trackFunnel: (event: Extract<PlusFunnelEvent, 'invite_sent'>) => Promise<void>
  purchase: (productId: PlusProductId) => Promise<{ error: string | null }>
  redeemPromo: (code: string) => Promise<{ error: string | null }>
}

const PlusContext = createContext<PlusContextValue | undefined>(undefined)

function asLifecycle(value: unknown): PlusLifecycle {
  if (
    value === 'trialing' ||
    value === 'active' ||
    value === 'grace' ||
    value === 'expired' ||
    value === 'paused'
  ) {
    return value
  }
  return 'none'
}

function asPlan(value: unknown): PlusPlan | null {
  if (
    value === 'trial' ||
    value === 'monthly' ||
    value === 'annual' ||
    value === 'founding_annual' ||
    value === 'lifetime'
  ) {
    return value
  }
  return null
}

function parseStatus(raw: unknown): PlusStatus {
  if (!raw || typeof raw !== 'object') return EMPTY
  const row = raw as Record<string, unknown>
  const status = asLifecycle(row.status)
  const plan = asPlan(row.plan)
  const trialEndsAt =
    typeof row.trial_ends_at === 'string' ? row.trial_ends_at : null
  const periodEndsAt =
    typeof row.current_period_ends_at === 'string'
      ? row.current_period_ends_at
      : null
  const graceEndsAt =
    typeof row.grace_period_ends_at === 'string'
      ? row.grace_period_ends_at
      : null
  const active = isPlusActive({
    status,
    plan,
    trialEndsAt,
    periodEndsAt,
    graceEndsAt,
  })
  return {
    entitlement: BOND_PLUS_ENTITLEMENT,
    status,
    plan,
    active: Boolean(row.active) || active,
    purchaserId:
      typeof row.purchaser_id === 'string' ? row.purchaser_id : null,
    isPurchaser: Boolean(row.is_purchaser),
    trialEndsAt,
    periodEndsAt,
    graceEndsAt,
    mutualReveals:
      typeof row.mutual_reveals === 'number' ? row.mutual_reveals : 0,
    foundingSlotsRemaining:
      typeof row.founding_slots_remaining === 'number'
        ? row.founding_slots_remaining
        : 250,
    trialEligible: Boolean(row.trial_eligible),
    offerEligible: Boolean(row.offer_eligible),
    restoreAvailable: Boolean(row.restore_available),
    hasTrialed: Boolean(row.has_trialed),
  }
}

async function rpcError(
  op: string,
  error: { message: string } | null,
): Promise<string | null> {
  if (!error) return null
  reportError('supabase', error.message, { op })
  return error.message
}

export function BondPlusProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const [status, setStatus] = useState<PlusStatus>(EMPTY)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user?.id || !profile?.couple_id) {
      setStatus(EMPTY)
      setIsLoading(false)
      return
    }
    setError(null)
    const { data, error: fetchError } = await supabase.rpc('plus_status')
    if (fetchError) {
      reportError('supabase', fetchError.message, { op: 'plus-status' })
      setError(fetchError.message)
      // Keep shipped features available until the entitlement row can be read.
      setStatus({ ...EMPTY, active: true })
      setIsLoading(false)
      return
    }
    setStatus(parseStatus(data))
    setIsLoading(false)
  }, [profile?.couple_id, user?.id])

  useEffect(() => {
    setIsLoading(true)
    void refresh()
  }, [refresh])

  const startTrial = useCallback(async () => {
    const { error: startError } = await supabase.rpc('start_plus_trial')
    const message = await rpcError('plus-trial', startError)
    if (!message) await refresh()
    return { error: message }
  }, [refresh])

  const restore = useCallback(async () => {
    const { error: restoreError } = await supabase.rpc('restore_plus')
    const message = await rpcError('plus-restore', restoreError)
    if (!message) await refresh()
    return { error: message }
  }, [refresh])

  const snoozeOffer = useCallback(async () => {
    const { error: snoozeError } = await supabase.rpc('snooze_plus_offer')
    if (snoozeError) {
      reportError('supabase', snoozeError.message, { op: 'plus-snooze' })
      return
    }
    await refresh()
  }, [refresh])

  const markPreviewViewed = useCallback(async () => {
    const { error: viewError } = await supabase.rpc('mark_plus_preview_viewed')
    if (viewError) {
      reportError('supabase', viewError.message, { op: 'plus-preview' })
    }
  }, [])

  const trackFunnel = useCallback(
    async (event: Extract<PlusFunnelEvent, 'invite_sent'>) => {
      const { error: trackError } = await supabase.rpc('track_plus_funnel', {
        ev: event,
        meta: {},
      })
      if (trackError) {
        reportError('supabase', trackError.message, { op: 'plus-funnel' })
      }
    },
    [],
  )

  const purchase = useCallback(
    async (productId: PlusProductId) => {
      const result = await purchaseBondPlus(productId)
      if (!result.error) await refresh()
      return result
    },
    [refresh],
  )

  const redeemPromo = useCallback(
    async (code: string) => {
      const { error: redeemError } = await supabase.rpc('redeem_plus_promo', {
        code,
      })
      const message = await rpcError('plus-promo', redeemError)
      if (!message) await refresh()
      return { error: message }
    },
    [refresh],
  )

  const value = useMemo<PlusContextValue>(
    () => ({
      ...status,
      isLoading,
      error,
      refresh,
      startTrial,
      restore,
      snoozeOffer,
      markPreviewViewed,
      trackFunnel,
      purchase,
      redeemPromo,
    }),
    [
      error,
      isLoading,
      markPreviewViewed,
      purchase,
      redeemPromo,
      refresh,
      restore,
      snoozeOffer,
      startTrial,
      status,
      trackFunnel,
    ],
  )

  return <PlusContext.Provider value={value}>{children}</PlusContext.Provider>
}

export function useBondPlus(): PlusContextValue {
  const value = useContext(PlusContext)
  if (!value) {
    throw new Error('useBondPlus must be used within BondPlusProvider')
  }
  return value
}
