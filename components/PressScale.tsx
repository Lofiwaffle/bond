import { type ReactNode, useRef } from 'react'
import {
  Animated,
  Pressable,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

import { hapticLight } from '../lib/haptics'

export function PressScale({
  children,
  onPress,
  disabled,
  haptic = true,
  scaleTo = 0.96,
  style,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityState,
}: {
  children: ReactNode
  onPress?: () => void
  disabled?: boolean
  haptic?: boolean
  scaleTo?: number
  style?: StyleProp<ViewStyle>
  accessibilityRole?: 'button' | 'link' | 'none'
  accessibilityLabel?: string
  accessibilityState?: AccessibilityState
}) {
  const scale = useRef(new Animated.Value(1)).current

  const springTo = (value: number, bounciness: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 28,
      bounciness,
    }).start()
  }

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPressIn={() => {
        if (disabled) return
        springTo(scaleTo, 4)
      }}
      onPressOut={() => springTo(1, 10)}
      onPress={() => {
        if (disabled || !onPress) return
        if (haptic) hapticLight()
        onPress()
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  )
}
