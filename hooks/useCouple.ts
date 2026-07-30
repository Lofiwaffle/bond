import { useAuth } from '../lib/auth'

/** Convenience hook for couple pairing state. */
export function useCouple() {
  const { profile, couple, partner, createCouple, joinCouple, refreshProfile } =
    useAuth()

  return {
    coupleId: profile?.couple_id ?? null,
    isPaired: Boolean(profile?.couple_id && partner),
    hasInvite: Boolean(profile?.couple_id && !partner),
    profile,
    couple,
    partner,
    createCouple,
    joinCouple,
    refreshProfile,
  }
}
