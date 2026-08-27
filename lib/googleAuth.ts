import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'

import { consumeAuthUrl } from './authCallback'
import { authRedirectUrl } from './authRedirect'
import {
  friendlyGoogleAuthError,
  googleAuthCancelled,
} from './googleAuthErrors'
import { supabase, supabaseConfigured, supabaseConfigError } from './supabase'

export { friendlyGoogleAuthError, googleAuthCancelled }

WebBrowser.maybeCompleteAuthSession()

/**
 * Sign in or create an account with Google via Supabase OAuth.
 * Enable the Google provider in the Supabase dashboard (web client ID + secret).
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!supabaseConfigured) {
    return { error: supabaseConfigError }
  }

  const redirectTo = authRedirectUrl('app')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error) {
    return { error: friendlyGoogleAuthError(error.message) }
  }

  if (Platform.OS === 'web') {
    return { error: null }
  }

  if (!data.url) {
    return { error: 'Could not start Google sign-in' }
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
