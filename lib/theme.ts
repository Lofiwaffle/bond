import { fonts } from './fonts'

export { fonts }

export const colors = {
  bg: '#FBF5EE',
  bgSoft: '#F4E6DC',
  frame: '#E8D4C8',
  ink: '#3C2A24',
  muted: '#6E534C',
  accent: '#FF6B9D',
  accentPressed: '#C44A6C',
  accentFill: '#C44A6C',
  /** Dark enough for small text and white labels (WCAG AA). */
  danger: '#B4233A',
  accentSoft: '#FBE6DC',
  onAccent: '#FFFFFF',
  border: '#EED9CE',
  hairline: '#E8D5CA',
  success: '#7EB892',
  card: '#FFFBF7',
  tabBar: '#FFFBF7',
  tabBarIcon: '#3C2A24',
  tabBarIconMuted: '#6E534C',
  white: '#FFFBF7',
  black: '#3C2A24',
  overlay: 'rgba(60, 42, 36, 0.4)',
}

/** Connection scores 1–5. Warm peach wash; accent is for selected states. */
export const scoreColors: Record<number, string> = {
  1: '#F0E2D8',
  2: '#E8D0C4',
  3: '#D4B4A6',
  4: '#B0897A',
  5: '#3C2A24',
}

export const scoreColorsSoft: Record<number, string> = {
  1: '#FBF5EE',
  2: '#F7EDE4',
  3: '#F4E6DC',
  4: '#EED9CE',
  5: '#E8D0C4',
}

export const SCORE_LABELS: Record<number, string> = {
  1: 'Distant',
  2: 'A little disconnected',
  3: 'Neutral',
  4: 'Connected',
  5: 'Very connected',
}

export const radii = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
}

export const hit = 44

/** Desktop web keeps a readable column; gutters match the page background. */
export const phoneMaxWidth = 430

export const hairlineWidth = 0.5

export const weights = {
  regular: '400' as const,
  medium: '500' as const,
}

export const type = {
  label: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
    color: colors.muted,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    color: colors.ink,
  },
  heading: {
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '500' as const,
    color: colors.ink,
  },
  display: {
    fontFamily: fonts.medium,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '500' as const,
    color: colors.ink,
  },
}

const cardShadow = {
  shadowColor: '#C9957A',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.14,
  shadowRadius: 18,
  elevation: 3,
  boxShadow: '0 8px 24px rgba(201, 149, 122, 0.14)',
}

const buttonShadow = {
  shadowColor: '#C44A6C',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 3,
  boxShadow: '0 4px 12px rgba(196, 74, 108, 0.22)',
}

const fabShadow = {
  shadowColor: '#C44A6C',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.28,
  shadowRadius: 14,
  elevation: 8,
  boxShadow: '0 8px 18px rgba(196, 74, 108, 0.28)',
}

export const elevation = {
  ios: {
    card: cardShadow,
    fab: fabShadow,
  },
  android: {
    card: { elevation: 3 },
    fab: { elevation: 8 },
  },
  default: {
    card: cardShadow,
    fab: fabShadow,
  },
  card: cardShadow,
  button: buttonShadow,
  fab: fabShadow,
}
