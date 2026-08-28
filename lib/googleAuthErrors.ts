export function googleAuthCancelled(type: string): boolean {
  return type === 'cancel' || type === 'dismiss'
}

export function friendlyGoogleAuthError(message: string): string {
  if (/provider is not enabled|unsupported provider/i.test(message)) {
    return 'Google sign-in is not enabled on this Bond server yet.'
  }
  if (/already registered|already been registered|already exists/i.test(message)) {
    return 'This email already has a Bond. Sign in with email, or use the Google account that created it.'
  }
  return message
}
