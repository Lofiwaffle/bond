import type { ComponentProps } from 'react'
import { Feather } from '@expo/vector-icons'

import { PixelFace } from './pixelFace'
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

/** Pixel-art connection faces, 1 far away → 5 very close. */
export function FaceIcon({
  score,
  size = 28,
}: {
  score: number
  size?: number
  color?: string
}) {
  return <PixelFace score={score} size={size} />
}
