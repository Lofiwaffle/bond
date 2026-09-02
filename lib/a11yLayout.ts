import { hit } from './theme'

export const LARGE_TEXT_SCALE = 1.3

export function isLargeText(fontScale: number): boolean {
  return fontScale >= LARGE_TEXT_SCALE
}

/** Grow 28–36 px visuals so large text and a 44 px hit area still fit. */
export function compactVisualSize(fontScale: number, base = 36): number {
  if (fontScale < 1.15) return base
  return Math.max(hit, Math.round(base * Math.min(fontScale, 1.75)))
}

export function calendarCellSize(
  available: number,
  weekCount: number,
  fontScale: number,
  gap = 5,
): number {
  const raw = Math.floor((available - (weekCount - 1) * gap) / Math.max(1, weekCount))
  const large = isLargeText(fontScale)
  const min = large ? hit : 22
  const max = large ? 48 : 36
  return Math.max(min, Math.min(max, raw))
}

export function tabBarHeight(fontScale: number): number {
  return Math.round(78 + Math.max(0, fontScale - 1) * 28)
}
