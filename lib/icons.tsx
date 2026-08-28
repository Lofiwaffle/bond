import type { ComponentProps } from 'react'
import { Image } from 'react-native'
import { Feather } from '@expo/vector-icons'

import { colors } from './theme'

export type IconName = ComponentProps<typeof Feather>['name']

export function Icon({
  name,
  size = 20,
  color = colors.ink,
}: {
  name: IconName
  size?: number
  color?: string
}) {
  return <Feather name={name} size={size} color={color} />
}

const FACE_IMAGES = {
  1: require('../assets/connection/distant-purple.png'),
  2: require('../assets/connection/disconnected-blue.png'),
  3: require('../assets/connection/3.png'),
  4: require('../assets/connection/4.png'),
  5: require('../assets/connection/5.png'),
} as const

/** Illustrated kawaii connection faces, 1 disconnected → 5 proud & united. */
export function FaceIcon({
  score,
  size = 28,
}: {
  score: number
  size?: number
  color?: string
}) {
  const clamped = Math.min(5, Math.max(1, Math.round(score))) as 1 | 2 | 3 | 4 | 5
  return (
    <Image
      source={FACE_IMAGES[clamped]}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  )
}
