export const colors = {
  bg: '#FFF8F1',
  bgSoft: '#FFEFD9',
  ink: '#2D2A26',
  muted: '#8A8178',
  accent: '#FF8A65',
  accentPressed: '#F4511E',
  accentSoft: '#FFE0D6',
  border: '#F0E4D8',
  danger: '#E53935',
  card: '#FFFFFF',
  tabBar: '#FFFFFF',
  white: '#FFFFFF',
}

/** Daylio-like pastel colors for connection scores 1–5 */
export const scoreColors: Record<number, string> = {
  1: '#EF9A9A',
  2: '#FFCC80',
  3: '#FFF59D',
  4: '#A5D6A7',
  5: '#80CBC4',
}

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

export const radii = {
  sm: 12,
  md: 18,
  lg: 28,
  pill: 999,
}
