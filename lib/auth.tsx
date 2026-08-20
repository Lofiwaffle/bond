import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { supabase } from './supabase'
import type { Couple, Profile } from '../types/database'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  couple: Couple | null
  partner: Profile | null
  isLoading: boolean
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error: string | null }>
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  createCouple: () => Promise<{ couple: Couple | null; error: string | null }>
  joinCouple: (
    inviteCode: string,
  ) => Promise<{ couple: Couple | null; error: string | null }>
  deleteAccount: () => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch profile', error.message)
    return null
  }

  return data
}

async function fetchCouple(coupleId: string): Promise<Couple | null> {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .eq('id', coupleId)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch couple', error.message)
    return null
  }

  return data
}

async function fetchPartner(
  coupleId: string,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('couple_id', coupleId)
    .neq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch partner', error.message)
    return null
  }

  return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [couple, setCouple] = useState<Couple | null>(null)
  const [partner, setPartner] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadCoupleState = useCallback(async (userId: string) => {
    const nextProfile = await fetchProfile(userId)
    setProfile(nextProfile)

    if (!nextProfile?.couple_id) {
      setCouple(null)
      setPartner(null)
      return
    }

    const [nextCouple, nextPartner] = await Promise.all([
      fetchCouple(nextProfile.couple_id),
      fetchPartner(nextProfile.couple_id, userId),
    ])
    setCouple(nextCouple)
    setPartner(nextPartner)
  }, [])

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) {
      setProfile(null)
      setCouple(null)
      setPartner(null)
      return
    }
    await loadCoupleState(userId)
  }, [loadCoupleState, session?.user?.id])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        loadCoupleState(data.session.user.id).finally(() => {
          if (mounted) setIsLoading(false)
        })
      } else {
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        void loadCoupleState(nextSession.user.id)
      } else {
        setProfile(null)
        setCouple(null)
        setPartner(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadCoupleState])

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim() },
        },
      })
      return { error: error?.message ?? null }
    },
    [],
  )

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setCouple(null)
    setPartner(null)
  }, [])

  const createCouple = useCallback(async () => {
    const { data, error } = await supabase.rpc('create_couple')
    if (error) {
      return { couple: null, error: error.message }
    }
    await refreshProfile()
    return { couple: data, error: null }
  }, [refreshProfile])

  const joinCouple = useCallback(
    async (inviteCode: string) => {
      const { data, error } = await supabase.rpc('join_couple', {
        invite: inviteCode.trim().toUpperCase(),
      })
      if (error) {
        return { couple: null, error: error.message }
      }
      await refreshProfile()
      return { couple: data, error: null }
    },
    [refreshProfile],
  )

  const deleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      return { error: error.message }
    }
    await supabase.auth.signOut()
    setProfile(null)
    setCouple(null)
    setPartner(null)
    return { error: null }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      couple,
      partner,
      isLoading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      createCouple,
      joinCouple,
      deleteAccount,
    }),
    [
      session,
      profile,
      couple,
      partner,
      isLoading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      createCouple,
      joinCouple,
      deleteAccount,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
