import * as AppleAuthentication from 'expo-apple-authentication'

import { reportError } from './monitor'
import { supabase, supabaseConfigured, supabaseConfigError } from './supabase'

export function friendlyAppleAuthError(message: string): string {
  if (/provider is not enabled|unsupported provider/i.test(message)) {
    return 'Sign in with Apple is not turned on in Supabase yet. Open Authentication → Providers → Apple and add the Bond iOS bundle id com.bond.app.'
  }
  return message
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync()
  } catch {
    return false
  }
}

export async function signInWithApple(): Promise<{ error: string | null }> {
  if (!supabaseConfigured) {
    return { error: supabaseConfigError }
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    })
    if (!credential.identityToken) {
      return { error: 'Apple did not return a sign-in token.' }
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    })
    if (error) {
      return { error: friendlyAppleAuthError(error.message) }
    }

    const name = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim()
    if (name) {
      await supabase.auth.updateUser({
        data: { display_name: name, full_name: name },
      })
      const { data } = await supabase.auth.getUser()
      if (data.user?.id) {
        await supabase
          .from('profiles')
          .update({ display_name: name })
          .eq('id', data.user.id)
      }
    }

    return { error: null }
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'ERR_REQUEST_CANCELED'
    ) {
      return { error: null }
    }
    const message =
      error instanceof Error ? error.message : 'Apple sign-in did not finish'
    reportError('auth', message, { op: 'apple' })
    return { error: friendlyAppleAuthError(message) }
  }
}
