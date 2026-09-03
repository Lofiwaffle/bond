const base = require('./app.json')

const TEST_ANDROID_APP = 'ca-app-pub-3940256099942544~3347511713'
const TEST_IOS_APP = 'ca-app-pub-3940256099942544~1458002511'
const AD_ID_PERMISSION = 'com.google.android.gms.permission.AD_ID'

function isProduction() {
  return process.env.APP_ENV === 'production'
}

function isGoogleTestAdId(id) {
  return typeof id === 'string' && id.includes('3940256099942544')
}

/** Play/AdMob reject Google sample app IDs. Production omits them until real secrets exist. */
function storeAdmobAppId(fromEnv, fallback) {
  if (fromEnv && !isGoogleTestAdId(fromEnv)) return fromEnv
  if (isProduction()) return null
  return fallback
}

module.exports = () => {
  const production = isProduction()
  const androidAppId = storeAdmobAppId(
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
    TEST_ANDROID_APP,
  )
  const iosAppId = storeAdmobAppId(
    process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
    TEST_IOS_APP,
  )
  const paidAdMob = Boolean(androidAppId || iosAppId)

  const plugins = base.plugins
    .map((plugin) => {
      if (Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads') {
        if (!paidAdMob) return null
        return [
          'react-native-google-mobile-ads',
          {
            ...(androidAppId ? { androidAppId } : {}),
            ...(iosAppId ? { iosAppId } : {}),
            delayAppMeasurementInit: true,
          },
        ]
      }
      if (Array.isArray(plugin) && plugin[0] === 'expo-build-properties') {
        return [
          'expo-build-properties',
          {
            ...plugin[1],
            android: {
              ...plugin[1].android,
              networkInspector: !production,
              usesCleartextTraffic: production ? false : plugin[1].android?.usesCleartextTraffic,
              useLegacyPackaging: false,
            },
            ios: {
              ...plugin[1].ios,
              networkInspector: !production,
            },
          },
        ]
      }
      return plugin
    })
    .filter(Boolean)

  const blockedPermissions = [
    ...(base.android?.blockedPermissions ?? []),
    ...(!paidAdMob && production ? [AD_ID_PERMISSION] : []),
  ]

  const nativeStoreBuild =
    process.env.EAS_BUILD_PLATFORM === 'android' ||
    process.env.EAS_BUILD_PLATFORM === 'ios'

  return {
    ...base,
    android: {
      ...base.android,
      blockedPermissions,
    },
    plugins,
    experiments: {
      typedRoutes: true,
      ...(nativeStoreBuild ? {} : { baseUrl: '/bond' }),
    },
    'react-native-google-mobile-ads': paidAdMob
      ? {
          ...(androidAppId ? { android_app_id: androidAppId } : {}),
          ...(iosAppId ? { ios_app_id: iosAppId } : {}),
          delay_app_measurement_init: true,
        }
      : undefined,
  }
}
