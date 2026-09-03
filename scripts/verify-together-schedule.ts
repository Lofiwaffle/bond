/**
 * Together lives on Growth, daily question lives in Check-in,
 * and one person can schedule without approval.
 * Run: npx --yes tsx scripts/verify-together-schedule.ts
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  datePlanCalendarEvent,
  datePlanReady,
  datePlanStart,
  normalizeDatePlan,
  opensCalendarOnTogetherTap,
  upcomingDateChips,
} from '../lib/datePlan'
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
const playScreen = readFileSync(join(root, 'app/(app)/play/[kind].tsx'), 'utf8')
const dateRoute = readFileSync(join(root, 'app/(app)/play/choose-date.tsx'), 'utf8')
const dateForm = readFileSync(join(root, 'components/DatePlanForm.tsx'), 'utf8')
const dateScreen = readFileSync(join(root, 'components/ChooseDateScreen.tsx'), 'utf8')
const togetherLauncher = readFileSync(
  join(root, 'components/TogetherLauncher.tsx'),
  'utf8',
)
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
assert(
  'Choose our date has its own route',
  dateRoute.includes('<ChooseDateScreen') &&
    playScreen.includes("if (kind === 'choose_date')") &&
    playScreen.includes('<ChooseDateScreen'),
)
assert(
  'Choose our date opens the planner, not the Start gate',
  dateForm.includes('What are we doing') &&
    dateForm.includes('>When</') &&
    dateForm.includes('>Where</') &&
    dateForm.includes('>Why</') &&
    dateForm.includes("label={busy ? 'Submitting…' : 'Submit'}") &&
    !dateScreen.includes('Both of you answer privately') &&
    !dateForm.includes('Both of you answer privately'),
)
assert(
  'Choose our date submits to the calendar',
  dateScreen.includes('openGoogleCalendarEvent(datePlanCalendarEvent(plan))'),
)
assert(
  'Together tap does not open a calendar for choose our date',
  togetherLauncher.includes("item.kind === 'choose_date'") &&
    !opensCalendarOnTogetherTap('choose_date') &&
    opensCalendarOnTogetherTap('know_me'),
)

const from = new Date(2026, 8, 3, 10, 0, 0)
const chips = upcomingDateChips(3, from)
assert('Upcoming date chips start today', chips[0]?.iso === '2026-09-03')
assert('Upcoming date chips label today', chips[0]?.label === 'Today')
assert('Upcoming date chips label tomorrow', chips[1]?.label === 'Tomorrow')
assert(
  'Date plan evening starts at 18:00',
  datePlanStart('2026-09-05', 'evening').getHours() === 18,
)
assert(
  'Date plan is ready with what, when, and where',
  datePlanReady({
    what: 'Coffee date',
    when: '2026-09-05',
    where: 'A cozy cafe',
  }),
)
assert(
  'Date plan is not ready without a day',
  !datePlanReady({ what: 'Coffee date', when: '', where: 'A cozy cafe' }),
)

const plan = normalizeDatePlan({
  what: 'Coffee date',
  when: '2026-09-05',
  whenTime: 'evening',
  where: 'A cozy cafe',
  why: 'A slow hour together',
})
assert('Date plan payload normalizes', Boolean(plan))
if (plan) {
  const event = datePlanCalendarEvent(plan)
  const dateUrl = googleCalendarEventUrl(event)
  assert(
    'Date calendar uses the chosen evening',
    dateUrl.includes('dates=20260905T180000/20260905T200000'),
  )
  assert(
    'Date calendar title includes what',
    dateUrl.includes(encodeURIComponent('Bond: Coffee date')),
  )
  assert(
    'Date calendar details include where and why',
    decodeURIComponent(dateUrl).includes('A cozy cafe') &&
      decodeURIComponent(dateUrl).includes('A slow hour together'),
  )
}

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
