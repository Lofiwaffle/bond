export function googleAuthCancelled(type: string): boolean {
  return type === 'cancel' || type === 'dismiss'
}

export function friendlyGoogleAuthError(message: string): string {
  const text = unwrapAuthMessage(message)
  if (/provider is not enabled|unsupported provider/i.test(`${message} ${text}`)) {
    return 'Google sign-in is not turned on in Supabase yet. Open Authentication → Providers → Google, enable it, and paste a Google Cloud web client ID and secret. Redirect URI: https://melmzlgzfcysbnvtuksv.supabase.co/auth/v1/callback'
  }
  if (/already registered|already been registered|already exists/i.test(text)) {
    return 'This email already has a Bond. Sign in with email, or use the Google account that created it.'
  }
  return text
}

/**
 * Probe the OAuth start URL before navigating. GoTrue returns JSON when
 * Google is disabled; a browser redirect would replace the login screen
 * with that payload.
 */
export async function googleAuthorizeStartError(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetcher(url, {
      method: 'GET',
      redirect: 'manual',
      headers: { Accept: 'application/json' },
    })
    if (response.type === 'opaqueredirect') return null
    if (response.status >= 300 && response.status < 400) return null
    if (response.ok) return null
    const body = await response.text()
    if (!body.trim()) return 'Could not start Google sign-in'
    return friendlyGoogleAuthError(body)
  } catch {
    return null
  }
}

function unwrapAuthMessage(message: string): string {
  const trimmed = message.trim()
  if (!trimmed.startsWith('{')) return message
  try {
    const parsed = JSON.parse(trimmed) as {
      msg?: string
      message?: string
      error_description?: string
    }
    return (
      parsed.msg ||
      parsed.error_description ||
      parsed.message ||
      message
    )
  } catch {
    return message
  }
}
