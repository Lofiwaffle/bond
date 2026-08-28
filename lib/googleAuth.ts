import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'

import { consumeAuthUrl } from './authCallback'
import { authRedirectUrl } from './authRedirect'
import {
  friendlyGoogleAuthError,
  googleAuthCancelled,
  googleAuthorizeStartError,
} from './googleAuthErrors'
import { supabase, supabaseConfigured, supabaseConfigError } from './supabase'

export { friendlyGoogleAuthError, googleAuthCancelled }

WebBrowser.maybeCompleteAuthSession()

function openWebOAuth(url: string) {
  if (typeof window !== 'undefined') {
    window.location.assign(url)
  }
}

/**
 * Sign in or create an account with Google via Supabase OAuth.
 * Enable the Google provider in the Supabase dashboard (web client ID + secret).
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!supabaseConfigured) {
    return { error: supabaseConfigError }
  }

  const redirectTo = authRedirectUrl('app')
  let data: { url?: string | null } | null = null
  try {
    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (result.error) {
      return { error: friendlyGoogleAuthError(result.error.message) }
    }
    data = result.data
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not start Google sign-in'
    return { error: friendlyGoogleAuthError(message) }
  }

  if (!data?.url) {
    return { error: 'Could not start Google sign-in' }
  }

  const blocked = await googleAuthorizeStartError(data.url)
  if (blocked) return { error: blocked }

  if (Platform.OS === 'web') {
    openWebOAuth(data.url)
    return { error: null }
  }

  try {
    await WebBrowser.warmUpAsync()
  } catch {
    // Warm-up is optional.
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (googleAuthCancelled(result.type)) {
    return { error: null }
  }
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    return { error: 'Google sign-in did not finish' }
  }

  const consumed = await consumeAuthUrl(result.url)
  if (consumed.error) {
    return { error: friendlyGoogleAuthError(consumed.error) }
  }
  return { error: null }
}
