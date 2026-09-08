import { Platform } from 'react-native'

/** Material ripple on oat / ivory surfaces. */
export const rippleInk = {
  color: 'rgba(58, 36, 48, 0.12)',
}

/** Material ripple on berry fills. */
export const rippleOnFill = {
  color: 'rgba(255, 255, 255, 0.22)',
}

export const rippleBorderless = {
  color: 'rgba(58, 36, 48, 0.12)',
  borderless: true as const,
}

/** Paint overlay windows under system bars on Android 15+ / target SDK 36. */
export const androidOverlayModal =
  Platform.OS === 'android'
    ? ({
        statusBarTranslucent: true,
        navigationBarTranslucent: true,
      } as const)
    : {}

/** Android extra font padding throws off compact labels and field vertical align. */
export const androidTextPad =
  Platform.OS === 'android' ? ({ includeFontPadding: false } as const) : {}
