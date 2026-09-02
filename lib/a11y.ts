import { useEffect, useState } from 'react'
import { AccessibilityInfo, useWindowDimensions } from 'react-native'

import {
  calendarCellSize,
  compactVisualSize,
  isLargeText,
  tabBarHeight,
} from './a11yLayout'
import { colors, hairlineWidth, hit } from './theme'

export {
  LARGE_TEXT_SCALE,
  calendarCellSize,
  compactVisualSize,
  isLargeText,
  tabBarHeight,
} from './a11yLayout'

export function useAccessibleLayout() {
  const { fontScale, width } = useWindowDimensions()
  const [highContrast, setHighContrast] = useState(false)
  const [boldText, setBoldText] = useState(false)

  useEffect(() => {
    let mounted = true
    const apply = (next: boolean) => {
      if (mounted && next) setHighContrast(true)
    }

    void AccessibilityInfo.isHighTextContrastEnabled?.().then((value) =>
      apply(Boolean(value)),
    )
    const darker = (
      AccessibilityInfo as typeof AccessibilityInfo & {
        isDarkerSystemColorsEnabled?: () => Promise<boolean>
      }
    ).isDarkerSystemColorsEnabled
    void darker?.().then((value) => apply(Boolean(value)))
    void AccessibilityInfo.isBoldTextEnabled?.().then((value) => {
      if (mounted) setBoldText(Boolean(value))
    })

    const contrast = AccessibilityInfo.addEventListener?.(
      'highTextContrastChanged',
      (value) => setHighContrast(Boolean(value)),
    )
    const bold = AccessibilityInfo.addEventListener?.(
      'boldTextChanged',
      (value) => setBoldText(Boolean(value)),
    )
    return () => {
      mounted = false
      contrast?.remove?.()
      bold?.remove?.()
    }
  }, [])

  const largeText = isLargeText(fontScale)
  const touch = Math.max(hit, Math.round(hit * Math.min(fontScale, 1.6)))

  return {
    fontScale,
    width,
    largeText,
    highContrast,
    boldText,
    touch,
    compactVisual: compactVisualSize(fontScale),
    muted: highContrast ? colors.ink : colors.muted,
    border: highContrast ? colors.ink : colors.border,
    hairline: highContrast ? colors.ink : colors.hairline,
    ruleWidth: highContrast ? 2 : hairlineWidth,
  }
}
