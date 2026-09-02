import { Platform } from 'react-native'
import type { EmailOtpType } from '@supabase/supabase-js'

import {
  hasAuthSessionPayload,
  isExpiredAuthLink,
  parseAuthCallback,
} from './authRedirect'
import { reportError } from './monitor'
import { supabase, supabaseConfigured } from './supabase'

export type ConsumeAuthResult = {
  recovery: boolean
  expired: boolean
  expiredKind: 'recovery' | 'signup' | null
  error: string | null
}

const OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

function asOtpType(value: string | null): EmailOtpType | null {
  if (value && OTP_TYPES.has(value as EmailOtpType)) {
    return value as EmailOtpType
  }
  return null
}

function stripAuthParamsFromAddressBar(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return
  const url = new URL(window.location.href)
  ;[
    'access_token',
    'refresh_token',
    'code',
    'token_hash',
    'type',
    'error',
    'error_code',
    'error_description',
  ].forEach((key) => url.searchParams.delete(key))
  url.hash = ''
  window.history.replaceState({}, '', `${url.pathname}${url.search}`)
}

let lastConsumedUrl: string | null = null

export async function consumeAuthUrl(
  url: string | null,
): Promise<ConsumeAuthResult> {
  if (!url || !supabaseConfigured) {
    return { recovery: false, expired: false, expiredKind: null, error: null }
  }
  if (url === lastConsumedUrl) {
    return { recovery: false, expired: false, expiredKind: null, error: null }
  }

  const parsed = parseAuthCallback(url)
  const expiredKind =
    parsed.type === 'recovery' ? 'recovery' : parsed.type ? 'signup' : null
  if (isExpiredAuthLink(parsed)) {
    stripAuthParamsFromAddressBar()
    return { recovery: false, expired: true, expiredKind, error: null }
  }

  if (parsed.errorCode && !hasAuthSessionPayload(parsed)) {
    stripAuthParamsFromAddressBar()
    return {
      recovery: false,
      expired: false,
      expiredKind: null,
      error: parsed.errorDescription?.replace(/\+/g, ' ') ?? 'That link is not valid.',
    }
  }

  if (!hasAuthSessionPayload(parsed)) {
    return { recovery: false, expired: false, expiredKind: null, error: null }
  }

  try {
    const otpType = asOtpType(parsed.type)
    if (parsed.tokenHash && otpType) {
      const { error } = await supabase.auth.verifyOtp({
        type: otpType,
        token_hash: parsed.tokenHash,
      })
      if (error) throw error
    } else if (parsed.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(parsed.code)
      if (error) throw error
    } else if (parsed.accessToken && parsed.refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: parsed.accessToken,
        refresh_token: parsed.refreshToken,
      })
      if (error) throw error
    }
    lastConsumedUrl = url
    stripAuthParamsFromAddressBar()
    return {
      recovery: parsed.type === 'recovery' || otpType === 'recovery',
      expired: false,
      expiredKind: null,
      error: null,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not open that link'
    reportError('auth', message, { op: 'callback' })
    const expired = /expired/i.test(message)
    return {
      recovery: false,
      expired,
      expiredKind: expired ? expiredKind : null,
      error: expired ? null : message,
    }
  }
}
