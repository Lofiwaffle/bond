import type { IconName } from './icons'
import { FEED_LAUNCHER, playMeta, type PlayKind } from './plays'

export type ActivityStatus = 'ready' | 'your_turn' | 'waiting'

export type ActivityTint = {
  /** Card wash */
  bg: string
  /** Glyph circle */
  glyphBg: string
  /** Icon and kicker on that wash. Dark enough for small text. */
  ink: string
}

/** One tint per activity so the board reads as a set of places, not a list. */
export const ACTIVITY_TINTS: Record<string, ActivityTint> = {
  know_me: { bg: '#FDEBF0', glyphBg: '#F7D3DE', ink: '#A62F53' },
  choose_date: { bg: '#FDE9DB', glyphBg: '#F8D3B8', ink: '#A85423' },
  appreciation: { bg: '#FBEFD6', glyphBg: '#F3DFB4', ink: '#8A6412' },
  weekly: { bg: '#E4EDF6', glyphBg: '#CBDDEE', ink: '#33587D' },
  memory: { bg: '#EFE4F3', glyphBg: '#DFCDE7', ink: '#6F4382' },
  dreams: { bg: '#E2EFE5', glyphBg: '#C9E1CF', ink: '#356B49' },
  challenge: { bg: '#FCE5DF', glyphBg: '#F6CDC2', ink: '#A94330' },
  ritual: { bg: '#F3E8D8', glyphBg: '#E7D6BC', ink: '#7C5D33' },
  repair: { bg: '#E6EDE6', glyphBg: '#D2DFD4', ink: '#456049' },
  checkin: { bg: '#FDE9DB', glyphBg: '#F8D3B8', ink: '#A85423' },
}

export const GROWTH_HUB_TINTS: Record<string, ActivityTint> = {
  achievements: { bg: '#FBEFD6', glyphBg: '#F3DFB4', ink: '#8A6412' },
  prompts: { bg: '#EFE4F3', glyphBg: '#DFCDE7', ink: '#6F4382' },
  goals: { bg: '#E2EFE5', glyphBg: '#C9E1CF', ink: '#356B49' },
  patterns: { bg: '#E4EDF6', glyphBg: '#CBDDEE', ink: '#33587D' },
  weekly: { bg: '#FDE9DB', glyphBg: '#F8D3B8', ink: '#A85423' },
  reviews: { bg: '#FDEBF0', glyphBg: '#F7D3DE', ink: '#A62F53' },
  plus: { bg: '#F3E8D8', glyphBg: '#E7D6BC', ink: '#7C5D33' },
}

export function activityTint(kind: string): ActivityTint {
  return ACTIVITY_TINTS[kind] ?? ACTIVITY_TINTS.know_me
}

export function growthHubTint(id: string): ActivityTint {
  return GROWTH_HUB_TINTS[id] ?? GROWTH_HUB_TINTS.plus
}

/** Repair is offered from Us, never from the Together board. */
export const BOARD_EXCLUDED: PlayKind[] = ['repair']

export type BoardPlay = {
  id: string
  kind: PlayKind
  mine: boolean
  partner: boolean
  revealed: boolean
  createdAt: string
}

export type ActivityRow = {
  id: string
  kind: PlayKind
  title: string
  icon: IconName
  status: ActivityStatus
}

export function activityStatus(play: {
  mine: boolean
  partner: boolean
  revealed: boolean
}): ActivityStatus {
  if (play.revealed && play.mine && play.partner) return 'ready'
  if (play.mine && !play.partner) return 'waiting'
  return 'your_turn'
}

const STATUS_ORDER: Record<ActivityStatus, number> = {
  ready: 0,
  your_turn: 1,
  waiting: 2,
}

/** In-progress rounds, newest first inside each state. One row per activity. */
export function activityRows(plays: BoardPlay[]): ActivityRow[] {
  const seen = new Set<PlayKind>()
  const rows: ActivityRow[] = []

  const sorted = [...plays].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  for (const play of sorted) {
    if (BOARD_EXCLUDED.includes(play.kind)) continue
    if (seen.has(play.kind)) continue
    const status = activityStatus(play)
    if (status === 'ready' && play.revealed === false) continue
    seen.add(play.kind)
    const meta = playMeta(play.kind)
    rows.push({
      id: play.id,
      kind: play.kind,
      title: meta.title,
      icon: meta.icon,
      status,
    })
  }

  return rows.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
}

export function activityStatusLabel(
  status: ActivityStatus,
  partnerName: string,
): string {
  if (status === 'ready') return 'Ready to open'
  if (status === 'your_turn') return 'Your turn'
  return `Waiting for ${partnerName}`
}

export function activityStatusHint(
  status: ActivityStatus,
  partnerName: string,
): string {
  if (status === 'ready') return 'You both answered. Open it together.'
  if (status === 'your_turn') return 'Answer privately whenever you have a minute.'
  return `Yours is saved. ${partnerName} has not answered yet.`
}

/** Tiles for starting something new. In-progress activities move to the rows above. */
export function startableItems(rows: ActivityRow[]) {
  const busy = new Set(rows.map((row) => row.kind as string))
  return FEED_LAUNCHER.filter((item) => !busy.has(item.kind as string))
}

export function boardSummary(rows: ActivityRow[]): string {
  const ready = rows.filter((row) => row.status === 'ready').length
  const mine = rows.filter((row) => row.status === 'your_turn').length
  if (ready > 0) {
    return `${ready} ready to open${mine > 0 ? ` · ${mine} waiting on you` : ''}`
  }
  if (mine > 0) return `${mine} waiting on you`
  if (rows.length > 0) return 'Waiting on your person'
  return 'One of you picks. No approval needed.'
}
