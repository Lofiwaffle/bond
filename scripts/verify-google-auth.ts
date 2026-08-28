/**
 * Google OAuth helpers. Run: npx --yes tsx scripts/verify-google-auth.ts
 */
import {
  friendlyGoogleAuthError,
  googleAuthCancelled,
  googleAuthorizeStartError,
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
    'Providers',
  ),
)
assert(
  'provider off json',
  friendlyGoogleAuthError(
    '{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}',
  ).includes('Providers'),
)
assert(
  'existing email',
  friendlyGoogleAuthError('User already registered').includes('already has a Bond'),
)
assert('passthrough', friendlyGoogleAuthError('Network request failed') === 'Network request failed')

const providerOffJson =
  '{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}'

void (async () => {
  const blocked = await googleAuthorizeStartError(
    'https://example.supabase.co/auth/v1/authorize?provider=google',
    async () =>
      new Response(providerOffJson, {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
  )
  assert('probe provider off', Boolean(blocked && blocked.includes('Providers')))

  const okRedirect = await googleAuthorizeStartError(
    'https://example.supabase.co/auth/v1/authorize?provider=google',
    async () =>
      new Response(null, {
        status: 302,
        headers: { Location: 'https://accounts.google.com/' },
      }),
  )
  assert('probe redirect is ok', okRedirect === null)

  console.log('verify-google-auth: ok')
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
