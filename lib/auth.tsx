import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AppState } from 'react-native'
import * as Linking from 'expo-linking'
import type { Session, User } from '@supabase/supabase-js'

import { consumeAuthUrl } from './authCallback'
import { signInWithGoogle as startGoogleSignIn } from './googleAuth'
import {
  RESET_REQUESTED_MESSAGE,
  authRedirectUrl,
} from './authRedirect'
import { captureInviteFromUrl, clearPendingInvite } from './invite'
import { reportError } from './monitor'
import { cancelAllBondNotifications } from './notifications'
import { clearOnboarding } from './onboarding'
import {
  SESSION_RESTORE_ERROR,
  SESSION_RESTORE_TIMEOUT_MS,
  withTimeout,
} from './startup'
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
  passwordRecovery: boolean
  authLinkExpired: boolean
  authLinkExpiredKind: 'recovery' | 'signup' | null
  retrySession: () => Promise<void>
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; emailNotConfirmed: boolean }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  verifyEmailOtp: (
    email: string,
    token: string,
  ) => Promise<{ error: string | null }>
  requestPasswordReset: (
    email: string,
  ) => Promise<{ error: string | null; message: string }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  resendConfirmation: (email: string) => Promise<{ error: string | null }>
  clearAuthLinkExpired: () => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  createCouple: () => Promise<{ couple: Couple | null; error: string | null }>
  joinCouple: (
    inviteCode: string,
  ) => Promise<{ couple: Couple | null; error: string | null }>
  deleteAccount: () => Promise<{ error: string | null }>
  leaveCouple: () => Promise<{ error: string | null }>
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
  const [isLoading, setIsLoading] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [authLinkExpired, setAuthLinkExpired] = useState(false)
  const [authLinkExpiredKind, setAuthLinkExpiredKind] = useState<
    'recovery' | 'signup' | null
  >(null)
  const userIdRef = useRef<string | undefined>(undefined)
  userIdRef.current = session?.user?.id

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
      let timedOut = false
      await withTimeout(
        (async () => {
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
        })(),
        SESSION_RESTORE_TIMEOUT_MS,
        () => {
          timedOut = true
        },
      )
      if (timedOut) {
        reportError('auth', SESSION_RESTORE_ERROR, { op: 'session-timeout' })
        setSession(null)
        setProfile(null)
        setCouple(null)
        setPartner(null)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : SESSION_RESTORE_ERROR
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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Defer so auth internals can finish before other Supabase work.
      setTimeout(() => {
        if (!mounted) return
        if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
        if (event === 'SIGNED_OUT') {
          setPasswordRecovery(false)
          setAuthLinkExpired(false)
          setAuthLinkExpiredKind(null)
        }
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
      }, 0)
    })

    const applyIncomingUrl = (url: string | null) => {
      void captureInviteFromUrl(url)
      void withTimeout(
        consumeAuthUrl(url),
        SESSION_RESTORE_TIMEOUT_MS,
        () => ({
          recovery: false,
          expired: false,
          expiredKind: null,
          error: null,
        }),
      ).then((result) => {
        if (!mounted) return
        if (result.recovery) setPasswordRecovery(true)
        if (result.expired) {
          setAuthLinkExpired(true)
          setAuthLinkExpiredKind(result.expiredKind)
        }
      })
    }
    void Linking.getInitialURL().then(applyIncomingUrl)
    const linking = Linking.addEventListener('url', (event) => {
      applyIncomingUrl(event.url)
    })

    const app = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      const userId = userIdRef.current
      if (!userId) return
      void loadCoupleState(userId).catch((err) => {
        reportError('auth', err, { op: 'resume-profile' })
      })
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      linking.remove()
      app.remove()
    }
  }, [loadCoupleState, restoreSession])

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!supabaseConfigured) {
        return { error: supabaseConfigError, needsConfirmation: false }
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim() },
          emailRedirectTo: authRedirectUrl('app'),
        },
      })
      if (error) {
        const already =
          /already registered|already been registered|user already/i.test(
            error.message,
          )
        if (already) {
          const resent = await supabase.auth.resend({
            type: 'signup',
            email: email.trim(),
            options: { emailRedirectTo: authRedirectUrl('app') },
          })
          if (resent.error) {
            const rateLimited = /rate limit|too many/i.test(resent.error.message)
            if (!rateLimited) {
              reportError('auth', resent.error.message, { op: 'signup-resend' })
            }
            return { error: resent.error.message, needsConfirmation: true }
          }
          return { error: null, needsConfirmation: true }
        }
        reportError('auth', error.message, { op: 'signup' })
        return { error: error.message, needsConfirmation: false }
      }
      return { error: null, needsConfirmation: !data.session }
    },
    [],
  )

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabaseConfigured) {
      return { error: supabaseConfigError, emailNotConfirmed: false }
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      const emailNotConfirmed = /not confirmed|confirm your email/i.test(
        error.message,
      )
      if (!emailNotConfirmed) {
        reportError('auth', error.message, { op: 'signin' })
      }
      return {
        error: emailNotConfirmed
          ? 'Confirm this email first. We can send another link.'
          : error.message,
        emailNotConfirmed,
      }
    }
    return { error: null, emailNotConfirmed: false }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabaseConfigured) {
      return { error: supabaseConfigError }
    }
    return startGoogleSignIn()
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!supabaseConfigured) {
      return { error: supabaseConfigError, message: '' }
    }
    const trimmed = email.trim()
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: authRedirectUrl('update-password'),
    })
    if (error) {
      const rateLimited = /rate limit|too many/i.test(error.message)
      if (rateLimited) {
        return { error: error.message, message: '' }
      }
      reportError('auth', error.message, { op: 'reset' })
    }
    return { error: null, message: RESET_REQUESTED_MESSAGE }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    if (!supabaseConfigured) {
      return { error: supabaseConfigError }
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      reportError('auth', error.message, { op: 'update-password' })
      return { error: error.message }
    }
    setPasswordRecovery(false)
    return { error: null }
  }, [])

  const resendConfirmation = useCallback(async (email: string) => {
    if (!supabaseConfigured) {
      return { error: supabaseConfigError }
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: authRedirectUrl('app') },
    })
    if (error) {
      const rateLimited = /rate limit|too many/i.test(error.message)
      if (!rateLimited) {
        reportError('auth', error.message, { op: 'resend' })
      }
      return { error: error.message }
    }
    return { error: null }
  }, [])

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    if (!supabaseConfigured) {
      return { error: supabaseConfigError }
    }
    const trimmed = token.replace(/\s/g, '')
    if (!/^\d{6}$/.test(trimmed)) {
      return { error: 'Enter the 6-digit code from the email.' }
    }
    const first = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmed,
      type: 'signup',
    })
    if (!first.error) return { error: null }
    const second = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: trimmed,
      type: 'email',
    })
    if (second.error) {
      reportError('auth', second.error.message, { op: 'verify-otp' })
      return { error: second.error.message }
    }
    return { error: null }
  }, [])

  const clearAuthLinkExpired = useCallback(() => {
    setAuthLinkExpired(false)
    setAuthLinkExpiredKind(null)
  }, [])

  const signOut = useCallback(async () => {
    await cancelAllBondNotifications()
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
      await clearPendingInvite()
      await refreshProfile()
      return { couple: data, error: null }
    },
    [refreshProfile],
  )

  const leaveCouple = useCallback(async () => {
    if (!supabaseConfigured) {
      return { error: supabaseConfigError }
    }
    const { error } = await supabase.rpc('leave_couple')
    if (error) {
      reportError('auth', error.message, { op: 'leave-couple' })
      return { error: error.message }
    }
    await cancelAllBondNotifications()
    await refreshProfile()
    return { error: null }
  }, [refreshProfile])

  const deleteAccount = useCallback(async () => {
    if (!supabaseConfigured) {
      return { error: supabaseConfigError }
    }
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      reportError('auth', error.message, { op: 'delete-account' })
      return { error: error.message }
    }
    await cancelAllBondNotifications()
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
      passwordRecovery,
      authLinkExpired,
      authLinkExpiredKind,
      retrySession: restoreSession,
      signUp,
      signIn,
      signInWithGoogle,
      requestPasswordReset,
      updatePassword,
      resendConfirmation,
      verifyEmailOtp,
      clearAuthLinkExpired,
      signOut,
      refreshProfile,
      createCouple,
      joinCouple,
      deleteAccount,
      leaveCouple,
      updateDisplayName,
    }),
    [
      session,
      profile,
      couple,
      partner,
      isLoading,
      sessionError,
      passwordRecovery,
      authLinkExpired,
      authLinkExpiredKind,
      restoreSession,
      signUp,
      signIn,
      signInWithGoogle,
      requestPasswordReset,
      updatePassword,
      resendConfirmation,
      verifyEmailOtp,
      clearAuthLinkExpired,
      signOut,
      refreshProfile,
      createCouple,
      joinCouple,
      deleteAccount,
      leaveCouple,
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
