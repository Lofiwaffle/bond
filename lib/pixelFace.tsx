import Svg, { Rect } from 'react-native-svg'
import { View } from 'react-native'

import {
  PIXEL_FACE_MAPS,
  PIXEL_FACE_SIZE,
} from './pixelFaceMaps'
import { colors, connectionTones } from './theme'

export { pixelFaceIsValid, pixelFaceMaps } from './pixelFaceMaps'

function palette(score: 1 | 2 | 3 | 4 | 5): Record<string, string> {
  const tone = connectionTones[score]
  return {
    s: tone.stroke,
    f: tone.fill,
    i: colors.ink,
    d: colors.accentPressed,
    p: colors.accent,
  }
}

export function PixelFace({
  score,
  size = 28,
}: {
  score: number
  size?: number
}) {
  const clamped = Math.min(5, Math.max(1, Math.round(score))) as 1 | 2 | 3 | 4 | 5
  const swatch = palette(clamped)
  const rows = PIXEL_FACE_MAPS[clamped]

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    >
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${PIXEL_FACE_SIZE} ${PIXEL_FACE_SIZE}`}
      >
        {rows.flatMap((row, y) =>
          row.split('').map((cell, x) => {
            const fill = swatch[cell]
            if (!fill) return null
            return (
              <Rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill={fill}
              />
            )
          }),
        )}
      </Svg>
    </View>
  )
}
