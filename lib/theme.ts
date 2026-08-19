export const colors = {
  bg: '#0A0A0A',
  bgSoft: '#121212',
  ink: '#F2F2F2',
  muted: '#8A8A8A',
  accent: '#7CFFB2',
  accentPressed: '#5AE89A',
  accentSoft: '#143D2A',
  border: '#2A2A2A',
  hairline: '#2A2A2A',
  danger: '#FF6B6B',
  success: '#7CFFB2',
  card: '#111111',
  tabBar: '#0A0A0A',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.65)',
}

/** Saturated connection scores 1–5: readable on true black */
export const scoreColors: Record<number, string> = {
  1: '#FF5C5C',
  2: '#FFB020',
  3: '#F5E06A',
  4: '#4CD964',
  5: '#7CFFB2',
}

export const scoreColorsSoft: Record<number, string> = {
  1: '#2A1212',
  2: '#2A1E0A',
  3: '#2A2610',
  4: '#0F2414',
  5: '#0F241C',
}

export const scoreEmojis: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
}

export const SCORE_LABELS: Record<number, string> = {
  1: 'Distant',
  2: 'A little',
  3: 'Okay',
  4: 'Close',
  5: 'Very connected',
}

/** Wireframe geometry: square-ish, thin borders */
export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
  pill: 999,
}

export const hit = 44

export const type = {
  largeTitle: 34,
  title: 28,
  title2: 22,
  headline: 17,
  body: 16,
  callout: 15,
  subhead: 14,
  footnote: 13,
  caption: 12,
}

/** Flat wireframe: no soft shadows */
export const elevation = {
  ios: {
    card: {},
    fab: {},
  },
  android: {
    card: { elevation: 0 },
    fab: { elevation: 0 },
  },
  default: {
    card: {},
    fab: {},
  },
}
