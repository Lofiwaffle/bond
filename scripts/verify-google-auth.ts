/**
 * Google OAuth helpers. Run: npx --yes tsx scripts/verify-google-auth.ts
 */
import {
  friendlyGoogleAuthError,
  googleAuthCancelled,
} from '../lib/googleAuthErrors'

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(label)
}

assert('cancel is cancelled', googleAuthCancelled('cancel'))
assert('dismiss is cancelled', googleAuthCancelled('dismiss'))
assert('success is not cancelled', googleAuthCancelled('success') === false)
assert(
  'provider off',
  friendlyGoogleAuthError('Unsupported provider: provider is not enabled').includes(
    'not enabled',
  ),
)
assert(
  'existing email',
  friendlyGoogleAuthError('User already registered').includes('already has a Bond'),
)
assert('passthrough', friendlyGoogleAuthError('Network request failed') === 'Network request failed')

console.log('verify-google-auth: ok')
