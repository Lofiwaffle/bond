export const colors = {
  bg: '#F7F2EF',
  bgSoft: '#F1EAEB',
  frame: '#E4D8DE',
  ink: '#3D2C33',
  muted: '#5E4A52',
  accent: '#FF6B9D',
  accentPressed: '#B83B68',
  accentFill: '#B83B68',
  /** Dark enough for small text and white labels (WCAG AA). */
  danger: '#B4233A',
  accentSoft: '#FFE4EE',
  onAccent: '#FFFFFF',
  border: '#E8DDE2',
  hairline: '#E4D8DE',
  success: '#7ED9A8',
  card: '#FFFFFF',
  tabBar: '#FFFFFF',
  tabBarIcon: '#3D2C33',
  tabBarIconMuted: '#5E4A52',
  white: '#FFFFFF',
  black: '#3D2C33',
  overlay: 'rgba(61, 44, 51, 0.38)',
}

/** Grayscale connection scores 1–5. Accent is reserved for selected states. */
export const scoreColors: Record<number, string> = {
  1: '#EDE6E8',
  2: '#D8CFD3',
  3: '#B9AEB3',
  4: '#8A7C82',
  5: '#3D2C33',
}

export const scoreColorsSoft: Record<number, string> = {
  1: '#F7F2EF',
  2: '#F3ECEE',
  3: '#EDE6E8',
  4: '#E4DCDF',
  5: '#D8CFD3',
}

export const SCORE_LABELS: Record<number, string> = {
  1: 'Distant',
  2: 'A little disconnected',
  3: 'Neutral',
  4: 'Connected',
  5: 'Very connected',
}

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
}

export const hit = 44

/** Desktop web frames the app at this width so layouts match a phone. */
export const phoneMaxWidth = 430

export const hairlineWidth = 0.5

export const weights = {
  regular: '400' as const,
  medium: '500' as const,
}

export const type = {
  label: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400' as const,
    color: colors.muted,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400' as const,
    color: colors.ink,
  },
  heading: {
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
