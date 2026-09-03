/**
 * Release gates that must stay true before an EAS production build.
 * Run: npx --yes tsx scripts/verify-production.ts
 */
import app from '../app.json'
import { PLUS_PAID_CHECKOUT_READY } from '../lib/bondPlus'
import {
  ACCOUNT_DELETION_REQUEST_URL,
  HOSTED_APP_URL,
  PRIVACY_POLICY_URL,
  SUPPORT_URL,
} from '../lib/appUrls'
import { bannerUnitId, isGoogleTestAdId } from '../lib/ads'

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(label)
}

assert('app version is 1.0.3', app.version === '1.0.3')
assert('android package is com.bondcouple.app', app.android.package === 'com.bondcouple.app')
assert('ios bundle is com.bond.app', app.ios.bundleIdentifier === 'com.bond.app')
assert('EAS project id is set', app.extra.eas.projectId.length > 8)
assert('owner is set', app.owner === 'lofiwaffle')
assert('target SDK 36', app.plugins.some((plugin) => {
  if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') return false
  return plugin[1]?.android?.targetSdkVersion === 36
}))
assert('minify on', app.plugins.some((plugin) => {
  if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') return false
  return plugin[1]?.android?.enableMinifyInReleaseBuilds === true
}))
assert('paid checkout stays off', PLUS_PAID_CHECKOUT_READY === false)
assert('privacy is static html', PRIVACY_POLICY_URL.endsWith('/privacy-policy.html'))
assert('support is static html', SUPPORT_URL.endsWith('/support.html'))
assert(
  'deletion URL points at support',
  ACCOUNT_DELETION_REQUEST_URL.startsWith(SUPPORT_URL),
)
assert('hosted app is https pages', HOSTED_APP_URL.startsWith('https://'))
assert(
  'auth callback html is in public',
  require('fs').existsSync(require('path').join(__dirname, '../public/auth-callback.html')),
)
assert(
  'sample admob is marked test',
  isGoogleTestAdId('ca-app-pub-3940256099942544~3347511713'),
)
assert(
  'android_app_id is in app.json',
  typeof app['react-native-google-mobile-ads']?.android_app_id === 'string' &&
    app['react-native-google-mobile-ads'].android_app_id.startsWith('ca-app-pub-'),
)
assert(
  'minify keeps async storage',
  app.plugins.some((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') return false
    return String(plugin[1]?.android?.extraProguardRules ?? '').includes(
      'asyncstorage',
    )
  }),
)

const previous = process.env.APP_ENV
const previousBanner = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID
process.env.APP_ENV = 'production'
delete process.env.EXPO_PUBLIC_ADMOB_BANNER_ID
assert('production does not request test banners', bannerUnitId('android') === null)
process.env.EXPO_PUBLIC_ADMOB_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111'
assert('production rejects a test banner env', bannerUnitId('android') === null)
if (previous === undefined) delete process.env.APP_ENV
else process.env.APP_ENV = previous
if (previousBanner === undefined) delete process.env.EXPO_PUBLIC_ADMOB_BANNER_ID
else process.env.EXPO_PUBLIC_ADMOB_BANNER_ID = previousBanner

console.log('production gates ok')
