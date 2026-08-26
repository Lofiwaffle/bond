/** Local calendar date as YYYY-MM-DD */
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDisplayDate(isoDate: string): string {
  const raw = String(isoDate ?? '')
  const [year, month, day] = raw.split('-').map(Number)
  if (!year || !month || !day) return raw
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function formatMonthTitle(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export const DAILY_PROMPT = 'How connected did you feel today?'

export { SCORE_LABELS } from './theme'

/** Days in a month grid starting Sunday (0): padded with nulls */
export function getMonthGrid(year: number, monthIndex: number): (number | null)[] {
  const first = new Date(year, monthIndex, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function dateKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Shift YYYY-MM-DD by delta days */
export function addDays(isoDate: string, delta: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + delta)
  return localDateString(date)
}

/** Sunday-start week that contains `date`. */
export function startOfWeek(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - date.getDay())
  return localDateString(date)
}

export function endOfWeek(isoDate: string): string {
  return addDays(startOfWeek(isoDate), 6)
}
