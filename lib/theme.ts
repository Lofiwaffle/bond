import { fonts } from './fonts'

export { fonts }

export const colors = {
  bg: '#F3EBE3',
  bgSoft: '#EFE6DC',
  frame: '#E6D9CE',
  ink: '#3A2430',
  muted: '#6A4E58',
  accent: '#C45C78',
  accentPressed: '#8E3550',
  accentFill: '#A33D5C',
  /** Dark enough for small text and white labels (WCAG AA). */
  danger: '#B4233A',
  accentSoft: '#F4E1E6',
  onAccent: '#FFFFFF',
  border: '#E4D5C9',
  hairline: '#E4D5C9',
  success: '#5E8F6E',
  card: '#FBF7F0',
  surface: '#FBF7F0',
  tabBar: '#FBF7F0',
  tabBarIcon: '#3A2430',
  tabBarIconMuted: '#6A4E58',
  white: '#FFFFFF',
  black: '#3A2430',
  overlay: 'rgba(58, 36, 48, 0.38)',
}

export type ConnectionTone = {
  fill: string
  stroke: string
  selected: string
}

/** Lavender, sky, sage, honey, coral — used for connection levels 1–5. */
export const connectionTones: Record<number, ConnectionTone> = {
  1: { fill: '#E6DCF2', stroke: '#6F5A8A', selected: '#D9CBEA' },
  2: { fill: '#D5E6F2', stroke: '#4E7390', selected: '#C5DCEC' },
  3: { fill: '#D8E6D2', stroke: '#5A7554', selected: '#C9DCC2' },
  4: { fill: '#F1E1BC', stroke: '#8C6A38', selected: '#E8D4A4' },
  5: { fill: '#F3D2C8', stroke: '#A85A48', selected: '#EBC3B6' },
}

export const scoreColors: Record<number, string> = {
  1: connectionTones[1].stroke,
  2: connectionTones[2].stroke,
  3: connectionTones[3].stroke,
  4: connectionTones[4].stroke,
  5: connectionTones[5].stroke,
}

export const scoreColorsSoft: Record<number, string> = {
  1: connectionTones[1].fill,
  2: connectionTones[2].fill,
  3: connectionTones[3].fill,
  4: connectionTones[4].fill,
  5: connectionTones[5].fill,
}

export const SCORE_LABELS: Record<number, string> = {
  1: 'Far away',
  2: 'Distant',
  3: 'Steady',
  4: 'Close',
  5: 'Very close',
}

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
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

export const motion = {
  fast: 160,
  duration: 180,
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
    lineHeight: 22,
    fontWeight: '400' as const,
    color: colors.ink,
  },
  heading: {
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500' as const,
    color: colors.ink,
  },
}

const cardShadow = {
  shadowColor: '#C9A8B4',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 18,
  elevation: 4,
}

const fabShadow = {
  shadowColor: '#3D2C33',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.16,
  shadowRadius: 10,
  elevation: 6,
}

export const elevation = {
  ios: {
    card: cardShadow,
    fab: fabShadow,
  },
  android: {
    card: { elevation: 4 },
    fab: { elevation: 6 },
  },
  default: {
    card: cardShadow,
    fab: fabShadow,
  },
  card: cardShadow,
  fab: fabShadow,
}
