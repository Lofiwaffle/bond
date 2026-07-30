/** Local calendar date as YYYY-MM-DD */
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export const DAILY_PROMPT = 'How connected did you feel today?'

export const SCORE_LABELS: Record<number, string> = {
  1: 'Distant',
  2: 'A little',
  3: 'Okay',
  4: 'Close',
  5: 'Very connected',
}
