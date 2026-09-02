const base = require('./app.json')

const TEST_ANDROID_APP = 'ca-app-pub-3940256099942544~3347511713'
const TEST_IOS_APP = 'ca-app-pub-3940256099942544~1458002511'

function isProduction() {
  return process.env.APP_ENV === 'production'
}

function isGoogleTestAdId(id) {
  return typeof id === 'string' && id.includes('3940256099942544')
}

function admobAppId(fromEnv, fallback) {
  if (fromEnv && !isGoogleTestAdId(fromEnv)) return fromEnv
  return fallback
}

module.exports = () => {
  const production = isProduction()
  const androidAppId = admobAppId(
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
    TEST_ANDROID_APP,
  )
  const iosAppId = admobAppId(
    process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
    TEST_IOS_APP,
  )

  const plugins = base.plugins.map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads') {
      return [
        'react-native-google-mobile-ads',
        {
          androidAppId,
          iosAppId,
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

  const nativeStoreBuild =
    process.env.EAS_BUILD_PLATFORM === 'android' ||
    process.env.EAS_BUILD_PLATFORM === 'ios'

  return {
    ...base,
    plugins,
    experiments: {
      typedRoutes: true,
      ...(nativeStoreBuild ? {} : { baseUrl: '/bond' }),
    },
    'react-native-google-mobile-ads': {
      android_app_id: androidAppId,
      ios_app_id: iosAppId,
      delay_app_measurement_init: true,
    },
  }
}
