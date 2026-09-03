import { type ReactNode, useEffect, useRef } from 'react'
import { Animated, type StyleProp, type ViewStyle } from 'react-native'

/** Soft fade and rise on mount. Staggered by `delay` so a list arrives in sequence. */
export function Appear({
  children,
  delay = 0,
  distance = 10,
  style,
}: {
  children: ReactNode
  delay?: number
  distance?: number
  style?: StyleProp<ViewStyle>
}) {
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      delay,
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [delay, progress])

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

/** Slow breath for a "ready to open" marker. Loops until unmounted. */
export function Breathe({
  children,
  active = true,
  style,
}: {
  children: ReactNode
  active?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const pulse = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!active) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [active, pulse])

  if (!active) return <Animated.View style={style}>{children}</Animated.View>

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            {
              scale: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.06],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}
