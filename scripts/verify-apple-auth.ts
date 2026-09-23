/**
 * Sign in with Apple copy and App Store gates.
 * Run: npx --yes tsx scripts/verify-apple-auth.ts
 */
import app from '../app.json'
import { friendlyAppleAuthError } from '../lib/appleAuth'

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(label)
}

assert('usesAppleSignIn', app.ios.usesAppleSignIn === true)
assert(
  'apple auth plugin',
  app.plugins.includes('expo-apple-authentication'),
)
assert(
  'tracking usage string',
  typeof app.ios.infoPlist.NSUserTrackingUsageDescription === 'string' &&
    app.ios.infoPlist.NSUserTrackingUsageDescription.includes('ads'),
)
assert(
  'provider-off copy',
  friendlyAppleAuthError('Unsupported provider: provider is not enabled').includes(
    'com.bond.app',
  ),
)
assert(
  'passthrough',
  friendlyAppleAuthError('Network request failed') === 'Network request failed',
)

console.log('verify-apple-auth: ok')
