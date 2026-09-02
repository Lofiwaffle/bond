import { Platform } from 'react-native'
import * as Linking from 'expo-linking'

import { HOSTED_APP_URL } from './appUrls'

export { HOSTED_APP_URL }

/** Production native OAuth / email return. Allow-list `bond://**` in Supabase Auth. */
export const NATIVE_AUTH_CALLBACK_URL = 'bond://auth-callback'

/** Production native recovery destination. Allow-list this in Supabase Auth. */
export const NATIVE_UPDATE_PASSWORD_URL = 'bond://update-password'

/** Static page that hands HTTPS auth links back to the Play/App Store install. */
export const HOSTED_AUTH_CALLBACK_URL = `${HOSTED_APP_URL}/auth-callback.html`

/** Production web recovery destination (GitHub Pages). */
export const HOSTED_UPDATE_PASSWORD_URL = `${HOSTED_APP_URL}/update-password`

export const RESET_REQUESTED_MESSAGE =
  'If that email is in Bond, we sent a link. Check your inbox in a few minutes.'

export const CONFIRM_EMAIL_MESSAGE =
  'Check your inbox for a Bond message. Open the link on this phone, or type the 6-digit code from that email.'

export const LINK_EXPIRED_MESSAGE =
  'That link expired. Request a new one below.'

export const RESEND_COOLDOWN_MS = 60_000

function webOriginPath(path: string): string {
  const base = (process.env.EXPO_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${base}${suffix === '/' ? '/' : suffix}`
  }
  return `${HOSTED_APP_URL}${suffix === '/' ? '' : suffix}`
}

export function nativeAuthReturnUrl(): string {
  if (Platform.OS === 'web') return webOriginPath('/')
  if (!__DEV__) return NATIVE_AUTH_CALLBACK_URL
  return Linking.createURL('auth-callback')
}

/** Google OAuth `redirectTo`. Native production uses a custom scheme so Chrome can return to the app. */
export function oauthRedirectUrl(): string {
  if (Platform.OS === 'web') return webOriginPath('/')
  return nativeAuthReturnUrl()
}

/** Platform redirect for signup confirmation and password recovery emails. */
export function authRedirectUrl(kind: 'update-password' | 'app'): string {
  if (kind === 'update-password') {
    if (Platform.OS === 'web') return webOriginPath('/update-password')
    if (!__DEV__) return NATIVE_UPDATE_PASSWORD_URL
    return Linking.createURL('update-password')
  }
  if (Platform.OS === 'web') return webOriginPath('/')
  if (!__DEV__) return HOSTED_AUTH_CALLBACK_URL
  return Linking.createURL('auth-callback')
}

export type AuthCallback = {
  accessToken: string | null
  refreshToken: string | null
  code: string | null
  tokenHash: string | null
  type: string | null
  errorCode: string | null
  errorDescription: string | null
}

function readParams(url: string): URLSearchParams {
  const params = new URLSearchParams()
  const hashIndex = url.indexOf('#')
  const queryIndex = url.indexOf('?')
  if (queryIndex >= 0) {
    const end = hashIndex >= 0 ? hashIndex : url.length
    new URLSearchParams(url.slice(queryIndex + 1, end)).forEach((value, key) => {
      params.set(key, value)
    })
  }
  if (hashIndex >= 0) {
    new URLSearchParams(url.slice(hashIndex + 1)).forEach((value, key) => {
      params.set(key, value)
    })
  }
  return params
}

export function parseAuthCallback(url: string): AuthCallback {
  const params = readParams(url)
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    code: params.get('code'),
    tokenHash: params.get('token_hash'),
    type: params.get('type'),
    errorCode: params.get('error_code') ?? params.get('error'),
    errorDescription: params.get('error_description'),
  }
}

export function isExpiredAuthLink(callback: AuthCallback): boolean {
  const code = (callback.errorCode ?? '').toLowerCase()
  const description = (callback.errorDescription ?? '').toLowerCase()
  return (
    code.includes('otp_expired') ||
    code === 'expired' ||
    description.includes('expired')
  )
}

export function hasAuthSessionPayload(callback: AuthCallback): boolean {
  return Boolean(
    callback.code ||
      callback.tokenHash ||
      (callback.accessToken && callback.refreshToken),
  )
}

export function isAuthCallbackPath(path: string): boolean {
  return (
    /auth-callback/i.test(path) ||
    hasAuthSessionPayload(parseAuthCallback(path))
  )
}

export function authCallbackRoute(path: string): string {
  const queryIndex = path.indexOf('?')
  const hashIndex = path.indexOf('#')
  const cut =
    queryIndex >= 0 ? queryIndex : hashIndex >= 0 ? hashIndex : path.length
  return `/auth-callback${path.slice(cut)}`
}

/** True so a store install can still open Connect and attach to Bond. */
export function showChangeServer(): boolean {
  return true
}
