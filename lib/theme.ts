export const colors = {
  bg: '#FFF7F0',
  bgSoft: '#FFE9D6',
  ink: '#1F1C1A',
  muted: '#7A726A',
  accent: '#FF7A59',
  accentPressed: '#E85A38',
  accentSoft: '#FFE2D8',
  border: '#EADFD4',
  hairline: '#E5D9CD',
  danger: '#D32F2F',
  success: '#2E7D32',
  card: '#FFFFFF',
  tabBar: '#FFFFFF',
  white: '#FFFFFF',
  overlay: 'rgba(31, 28, 26, 0.45)',
}

/** Daylio-like pastel colors for connection scores 1–5 */
export const scoreColors: Record<number, string> = {
  1: '#EF9A9A',
  2: '#FFCC80',
  3: '#FFF59D',
  4: '#A5D6A7',
  5: '#80CBC4',
}

/** Daylio-like pastel colors for connection scores 1–5 */
export const scoreColorsSoft: Record<number, string> = {
  1: '#FFEBEE',
  2: '#FFF3E0',
  3: '#FFFDE7',
  4: '#E8F5E9',
  5: '#E0F2F1',
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

/** iOS prefers continuous/pill; MD3 prefers 12–16dp filled buttons */
export const radii = {
  sm: 12,
  md: 18,
  lg: 28,
  pill: 999,
}

/** Minimum interactive target — 44pt HIG / 48dp Material */
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

/** iOS ripple effect; MD3 ripple */
export const elevation = {
  ios: {
    card: {
      shadowColor: '#1F1C1A',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    fab: {
      shadowColor: '#1F1C1A',
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    },
  },
  android: {
    card: { elevation: 1 },
    fab: { elevation: 6 },
  },
  default: {
    card: {
      shadowColor: '#1F1C1A',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    fab: {
      shadowColor: '#1F1C1A',
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    },
  },
}