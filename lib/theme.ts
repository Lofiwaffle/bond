export const colors = {
  bg: '#F7F2EF',
  bgSoft: '#FFF8F5',
  ink: '#3D2C33',
  muted: '#9A8690',
  accent: '#FF6B9D',
  accentPressed: '#F0558A',
  accentSoft: '#FFE4EE',
  onAccent: '#FFFFFF',
  border: '#F0E4E9',
  hairline: '#EDE0E6',
  danger: '#FF6B7A',
  success: '#7ED9A8',
  card: '#FFFFFF',
  tabBar: '#FF6B9D',
  tabBarIcon: '#FFFFFF',
  tabBarIconMuted: 'rgba(255, 255, 255, 0.62)',
  white: '#FFFFFF',
  black: '#3D2C33',
  overlay: 'rgba(61, 44, 51, 0.38)',
}

/** Soft, candy-like connection scores 1–5 */
export const scoreColors: Record<number, string> = {
  1: '#FF7A88',
  2: '#FFB347',
  3: '#FFE066',
  4: '#7ED9A8',
  5: '#7EDDD3',
}

export const scoreColorsSoft: Record<number, string> = {
  1: '#FFE8EB',
  2: '#FFF1DC',
  3: '#FFF8D9',
  4: '#E4F8EE',
  5: '#E2F7F5',
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

/** Soft, bubbly geometry */
export const radii = {
  sm: 14,
  md: 20,
  lg: 26,
  xl: 32,
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

const cardShadow = {
  shadowColor: '#C9A8B4',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 18,
  elevation: 4,
}

const fabShadow = {
  shadowColor: '#FF6B9D',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.28,
  shadowRadius: 14,
  elevation: 8,
}

export const elevation = {
  ios: {
    card: cardShadow,
    fab: fabShadow,
  },
  android: {
    card: { elevation: 4 },
    fab: { elevation: 8 },
  },
  default: {
    card: cardShadow,
    fab: fabShadow,
  },
  card: cardShadow,
  fab: fabShadow,
}
