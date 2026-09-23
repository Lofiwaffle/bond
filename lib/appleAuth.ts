/** Web / Android: Sign in with Apple is an iPhone-only App Store requirement. */

export async function isAppleSignInAvailable(): Promise<boolean> {
  return false
}

export async function signInWithApple(): Promise<{ error: string | null }> {
  return { error: 'Sign in with Apple is only on iPhone.' }
}

export function friendlyAppleAuthError(message: string): string {
  if (/provider is not enabled|unsupported provider/i.test(message)) {
    return 'Sign in with Apple is not turned on in Supabase yet. Open Authentication → Providers → Apple and add the Bond iOS bundle id com.bond.app.'
  }
  return message
}
