/**
 * Together lives on Growth, daily question lives in Check-in,
 * and one person can schedule without approval.
 * Run: npx --yes tsx scripts/verify-together-schedule.ts
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  compactLocalDateTime,
  defaultTogetherStart,
  googleCalendarEventUrl,
} from '../lib/googleCalendarUrl'
import { inAppSignalCopy } from '../lib/notificationCopy'
import { VISIBILITY_ROWS } from '../lib/privacy'
import { colors } from '../lib/theme'
import { timeOfDayHello } from '../lib/dates'

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(label)
}

const root = join(__dirname, '..')
const feed = readFileSync(join(root, 'app/(app)/(tabs)/index.tsx'), 'utf8')
const growth = readFileSync(join(root, 'app/(app)/(tabs)/stats.tsx'), 'utf8')
const checkIn = readFileSync(join(root, 'app/(app)/check-in.tsx'), 'utf8')
const words = readFileSync(join(root, 'components/CheckInMoment.tsx'), 'utf8')
const draft = readFileSync(join(root, 'lib/checkInDraft.ts'), 'utf8')
const schedule = readFileSync(join(root, 'lib/togetherSchedule.ts'), 'utf8')
const catchup = readFileSync(
  join(root, 'supabase/catchup_together_schedule.sql'),
  'utf8',
)

assert('Feed does not mount Together', !feed.includes('TogetherLauncher'))
assert(
  'Feed points the daily question at Check-in',
  feed.includes('The daily question lives in check-in') &&
    feed.includes("router.push('/(app)/check-in')"),
)
assert('Growth mounts Together', growth.includes('<TogetherLauncher inset={false} />'))
assert(
  'Check-in starts on the daily question',
  checkIn.includes("useState<CheckInDraft['step']>('words')") &&
    checkIn.includes('<WordsStep'),
)
assert(
  'Daily question is step 1 of check-in',
  words.includes('<Text style={styles.kicker}>Daily question</Text>') &&
    words.includes('<CheckInProgress step={1} />'),
)
assert("Drafts default to the daily question", draft.includes("step: 'words'"))
assert(
  'Together notify is allowed without partner approval',
  catchup.includes("'together_scheduled'") &&
    catchup.includes("event_type in ('check_in_nudge', 'together_scheduled')"),
)
assert(
  'Schedule helper says no approval',
  schedule.includes('No approval needed') &&
    schedule.includes('TOGETHER_SCHEDULED_EVENT'),
)

const morning = new Date(2026, 8, 3, 10, 0, 0)
const evening = new Date(2026, 8, 3, 20, 0, 0)
const tonight = defaultTogetherStart(morning)
assert('Default start is 7pm when that is still ahead', tonight.getHours() === 19)
const later = defaultTogetherStart(evening)
assert(
  'Default start is an hour from now after 7pm',
  later.getTime() === evening.getTime() + 60 * 60 * 1000,
)

const start = new Date(2026, 8, 3, 19, 0, 0)
const url = googleCalendarEventUrl({
  title: 'Bond: How well do you know me?',
  details:
    'One of you picked this in Bond. No approval needed — just show up if you can.',
  start,
  durationMinutes: 60,
})
assert(
  'Calendar URL is a Google template',
  url.startsWith('https://calendar.google.com/calendar/render?'),
)
assert(
  'Calendar URL is timed, not all-day',
  url.includes('dates=20260903T190000/20260903T200000'),
)
assert(
  'Calendar URL includes the title',
  url.includes(encodeURIComponent('Bond: How well do you know me?')),
)
assert(
  'Compact local time has no timezone suffix',
  compactLocalDateTime(start) === '20260903T190000',
)

assert(
  'In-app copy tells them it was scheduled',
  inAppSignalCopy('together_scheduled') ===
    'Your partner scheduled a together time.',
)
assert(
  'Visibility copy says no approval',
  VISIBILITY_ROWS.some(
    (row) =>
      row.entry === 'Together activities' &&
      row.who.includes('They do not have to approve'),
  ),
)
assert('cream canvas is warm', colors.bg === '#FBF5EE')
assert(
  'morning greeting',
  timeOfDayHello(new Date(2026, 8, 3, 9, 0, 0)) === 'Good morning',
)
assert(
  'evening greeting',
  timeOfDayHello(new Date(2026, 8, 3, 20, 0, 0)) === 'Good evening',
)

console.log('together schedule, Growth placement, and check-in prompt ok')
