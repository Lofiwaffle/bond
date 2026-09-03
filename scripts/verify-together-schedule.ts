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
import {
  activityRows,
  activityStatus,
  activityStatusLabel,
  activityTint,
  boardSummary,
  growthHubTint,
  startableItems,
} from '../lib/activityBoard'
import { inAppSignalCopy } from '../lib/notificationCopy'
import {
  TOGETHER_SIGNAL_SETUP_NOTICE,
  isMissingSignalPolicy,
} from '../lib/togetherSignal'
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
const deviceCalendar = readFileSync(join(root, 'lib/deviceCalendar.ts'), 'utf8')
const appConfig = readFileSync(join(root, 'app.json'), 'utf8')
const togetherLauncher = readFileSync(
  join(root, 'components/TogetherBoard.tsx'),
  'utf8',
)
const catchup = readFileSync(
  join(root, 'supabase/catchup_together_schedule.sql'),
  'utf8',
)

assert(
  'Feed does not mount Together',
  !feed.includes('TogetherLauncher') && !feed.includes('TogetherBoard'),
)
assert(
  'Feed points the daily question at Check-in',
  feed.includes('The daily question lives in check-in') &&
    feed.includes("router.push('/(app)/check-in')"),
)
assert('Growth mounts Together', growth.includes('<TogetherBoard inset={false} />'))
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
  dateScreen.includes('scheduleCalendarEvent(datePlanCalendarEvent(plan))'),
)
assert(
  'iOS and Android write to the device calendar',
  deviceCalendar.includes("Platform.OS !== 'ios' && Platform.OS !== 'android'") &&
    deviceCalendar.includes('createEvent') &&
    appConfig.includes('"expo-calendar"') &&
    appConfig.includes('WRITE_CALENDAR'),
)
assert(
  'Together tap does not open a calendar for choose our date',
  togetherLauncher.includes("item.kind === 'choose_date'") &&
    !opensCalendarOnTogetherTap('choose_date') &&
    opensCalendarOnTogetherTap('know_me'),
)

assert(
  'A missing signal policy is a setup notice, not a console error',
  isMissingSignalPolicy(
    'new row violates row-level security policy for table "partner_signals"',
  ) &&
    !isMissingSignalPolicy('network request failed') &&
    schedule.includes('isMissingSignalPolicy(insertError.message)') &&
    schedule.includes('notice: TOGETHER_SIGNAL_SETUP_NOTICE') &&
    TOGETHER_SIGNAL_SETUP_NOTICE.includes('catch-up'),
)
assert(
  'The board surfaces that notice instead of failing the pick',
  togetherLauncher.includes('result.notice'),
)

const boardPlays = [
  {
    id: 'p-ready',
    kind: 'know_me' as const,
    mine: true,
    partner: true,
    revealed: true,
    createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'p-mine',
    kind: 'dreams' as const,
    mine: true,
    partner: false,
    revealed: false,
    createdAt: '2026-09-02T10:00:00.000Z',
  },
  {
    id: 'p-turn',
    kind: 'memory' as const,
    mine: false,
    partner: true,
    revealed: false,
    createdAt: '2026-09-03T10:00:00.000Z',
  },
  {
    id: 'p-repair',
    kind: 'repair' as const,
    mine: false,
    partner: true,
    revealed: false,
    createdAt: '2026-09-03T11:00:00.000Z',
  },
]

assert(
  'Board states cover ready, your turn, and waiting',
  activityStatus({ mine: true, partner: true, revealed: true }) === 'ready' &&
    activityStatus({ mine: false, partner: true, revealed: false }) === 'your_turn' &&
    activityStatus({ mine: true, partner: false, revealed: false }) === 'waiting',
)

const rows = activityRows(boardPlays)
assert('Ready rounds come first', rows[0]?.status === 'ready')
assert('Your turn comes before waiting', rows[1]?.status === 'your_turn')
assert('Waiting is last', rows[2]?.status === 'waiting')
assert('Repair never shows on the board', !rows.some((row) => row.kind === 'repair'))
assert(
  'In-progress activities leave the start row',
  !startableItems(rows).some((item) => item.kind === 'know_me') &&
    startableItems(rows).some((item) => item.kind === 'choose_date'),
)
assert(
  'Board summary counts what needs them',
  boardSummary(rows) === '1 ready to open · 1 waiting on you',
)
assert(
  'Empty board explains the rule',
  boardSummary([]) === 'One of you picks. No approval needed.',
)
assert(
  'Waiting names the partner',
  activityStatusLabel('waiting', 'Sam') === 'Waiting for Sam' &&
    activityStatusLabel('ready', 'Sam') === 'Ready to open',
)
assert(
  'Every activity has its own tint',
  new Set(
    ['know_me', 'choose_date', 'appreciation', 'weekly', 'memory', 'dreams'].map(
      (kind) => activityTint(kind).bg,
    ),
  ).size === 6,
)
assert(
  'Growth hub rows are tinted too',
  growthHubTint('goals').bg !== growthHubTint('reviews').bg &&
    growth.includes('growthHubTint(item.id)'),
)
assert(
  'Growth animates its cards',
  growth.includes('<Appear') && togetherLauncher.includes('<Appear'),
)
assert(
  'Ready rounds breathe',
  togetherLauncher.includes('<Breathe active={ready}'),
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
  assert(
    'Date calendar includes the place',
    dateUrl.includes(encodeURIComponent('A cozy cafe')),
  )
  assert('Date calendar event has a location', event.location === 'A cozy cafe')
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
