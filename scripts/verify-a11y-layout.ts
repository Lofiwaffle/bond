/**
 * Compact-control sizing for large text. Physical device pass is still required.
 * Run: npx --yes tsx scripts/verify-a11y-layout.ts
 */
import {
  LARGE_TEXT_SCALE,
  calendarCellSize,
  compactVisualSize,
  isLargeText,
  tabBarHeight,
} from '../lib/a11yLayout'
import { hit } from '../lib/theme'

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(label)
}

assert('default 36 stays 36', compactVisualSize(1, 36) === 36)
assert('28 stays 28 at default', compactVisualSize(1, 28) === 28)
assert(
  'large text lifts 36 to at least 44',
  compactVisualSize(1.3, 36) >= hit,
)
assert(
  'extra-large text stays capped',
  compactVisualSize(2.2, 36) === Math.round(36 * 1.75),
)

assert('calendar can stay compact', calendarCellSize(280, 12, 1) <= 36)
assert(
  'large-text calendar cells are 44+',
  calendarCellSize(280, 12, LARGE_TEXT_SCALE) >= hit,
)
assert('tab bar grows with scale', tabBarHeight(1.5) > tabBarHeight(1))
assert('large text threshold', isLargeText(1.3) && !isLargeText(1.2))

console.log('a11y layout math ok — still confirm on a physical phone')
