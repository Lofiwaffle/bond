import { localDateString, monthFromDate } from './dates'

export type HistoryViewState = {
  year: number
  month: number
  score: number | null
  activity: string | null
  scrollY: number
}

function currentMonth(): { year: number; month: number } {
  return monthFromDate(localDateString())
}

let view: HistoryViewState = {
  ...currentMonth(),
  score: null,
  activity: null,
  scrollY: 0,
}

export function readHistoryView(): HistoryViewState {
  return { ...view }
}

export function writeHistoryView(patch: Partial<HistoryViewState>): HistoryViewState {
  if (patch.year != null && patch.year !== view.year) {
    view.scrollY = 0
  }
  if (patch.month != null && patch.month !== view.month) {
    view.scrollY = 0
  }
  view = { ...view, ...patch }
  return readHistoryView()
}

export function isViewingCurrentMonth(
  year: number,
  month: number,
  today = localDateString(),
): boolean {
  const now = monthFromDate(today)
  return year === now.year && month === now.month
}
