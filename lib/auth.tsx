import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AppState } from 'react-native'
import type { Session, User } from '@supabase/supabase-js'

import { reportError } from './monitor'
import { clearOnboarding } from './onboarding'
import { supabase, supabaseConfigured, supabaseConfigError } from './supabase'
import type { Couple, Profile } from '../types/database'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  couple: Couple | null
  partner: Profile | null
  isLoading: boolean
  sessionError: string | null
  retrySession: () => Promise<void>
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
  updateDisplayName: (name: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    reportError('auth', error.message, { op: 'profile' })
    throw new Error(error.message)
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
    reportError('auth', error.message, { op: 'couple' })
    throw new Error(error.message)
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
    reportError('auth', error.message, { op: 'partner' })
    throw new Error(error.message)
  }

  return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [couple, setCouple] = useState<Couple | null>(null)
  const [partner, setPartner] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  const loadCoupleState = useCallback(async (userId: string) => {
    try {
      const nextProfile = await fetchProfile(userId)
      setProfile(nextProfile)

      if (!nextProfile?.couple_id) {
        setCouple(null)
        setPartner(null)
        setSessionError(null)
        return
      }

      const [nextCouple, nextPartner] = await Promise.all([
        fetchCouple(nextProfile.couple_id),
        fetchPartner(nextProfile.couple_id, userId),
      ])
      setCouple(nextCouple)
      setPartner(nextPartner)
      setSessionError(null)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not load your Bond'
      reportError('auth', message, { op: 'couple-state' })
      setSessionError(message)
    }
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

  const restoreSession = useCallback(async () => {
    if (!supabaseConfigured) {
      setIsLoading(false)
      return
    }
    setSessionError(null)
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      setSession(data.session)
      if (data.session?.user) {
        await loadCoupleState(data.session.user.id)
      } else {
        setProfile(null)
        setCouple(null)
        setPartner(null)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not restore your session'
      reportError('auth', message, { op: 'session' })
      setSessionError(message)
    } finally {
      setIsLoading(false)
    }
  }, [loadCoupleState])

  useEffect(() => {
    let mounted = true

    if (!supabaseConfigured) {
      setIsLoading(false)
      return
    }

    void restoreSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      if (nextSession?.user) {
        void loadCoupleState(nextSession.user.id).catch((error) => {
          const message =
            error instanceof Error ? error.message : 'Could not load your Bond'
          setSessionError(message)
        })
      } else {
        setProfile(null)
        setCouple(null)
        setPartner(null)
      }
    })

    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void supabase.auth.getSession().then(({ data, error }) => {
          if (error) {
            reportError('auth', error.message, { op: 'resume' })
            return
          }
          if (data.session?.user) {
            void loadCoupleState(data.session.user.id).catch((err) => {
              reportError('auth', err, { op: 'resume-profile' })
            })
          }
        })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      app.remove()
    }
  }, [loadCoupleState, restoreSession])

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!supabaseConfigured) {
        return { error: supabaseConfigError }
      }
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim() },
        },
      })
      if (error) {
        reportError('auth', error.message, { op: 'signup' })
        return { error: error.message }
      }
      return { error: null }
    },
    [],
  )

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseConfigured) {
      return { error: supabaseConfigError }
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      reportError('auth', error.message, { op: 'signin' })
      return { error: error.message }
    }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setCouple(null)
    setPartner(null)
  }, [])

  const createCouple = useCallback(async () => {
    if (!supabaseConfigured) {
      return { couple: null, error: supabaseConfigError }
    }
    const { data, error } = await supabase.rpc('create_couple')
    if (error) {
      reportError('auth', error.message, { op: 'create-couple' })
      return { couple: null, error: error.message }
    }
    await refreshProfile()
    return { couple: data, error: null }
  }, [refreshProfile])

  const joinCouple = useCallback(
    async (inviteCode: string) => {
      if (!supabaseConfigured) {
        return { couple: null, error: supabaseConfigError }
      }
      const { data, error } = await supabase.rpc('join_couple', {
        invite: inviteCode.trim().toUpperCase(),
      })
      if (error) {
        reportError('auth', error.message, { op: 'join-couple' })
        return { couple: null, error: error.message }
      }
      await refreshProfile()
      return { couple: data, error: null }
    },
    [refreshProfile],
  )

  const deleteAccount = useCallback(async () => {
    if (!supabaseConfigured) {
      return { error: supabaseConfigError }
    }
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      reportError('auth', error.message, { op: 'delete-account' })
      return { error: error.message }
    }
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // User row is already gone; drop the local session anyway.
    }
    setSession(null)
    setProfile(null)
    setCouple(null)
    setPartner(null)
    await clearOnboarding()
    return { error: null }
  }, [])

  const updateDisplayName = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return { error: 'Enter a display name' }
      const userId = session?.user?.id
      if (!userId) return { error: 'Not signed in' }
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('id', userId)
      if (error) {
        reportError('auth', error.message, { op: 'display-name' })
        return { error: error.message }
      }
      setProfile((current) =>
        current ? { ...current, display_name: trimmed } : current,
      )
      return { error: null }
    },
    [session?.user?.id],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      couple,
      partner,
      isLoading,
      sessionError,
      retrySession: restoreSession,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      createCouple,
      joinCouple,
      deleteAccount,
      updateDisplayName,
    }),
    [
      session,
      profile,
      couple,
      partner,
      isLoading,
      sessionError,
      restoreSession,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      createCouple,
      joinCouple,
      deleteAccount,
      updateDisplayName,
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
