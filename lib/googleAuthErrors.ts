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
