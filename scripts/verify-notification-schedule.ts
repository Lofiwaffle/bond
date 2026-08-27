import {
  DEFAULT_NOTIFICATION_PREFS,
  isInQuietHours,
  nextDailyReminderAt,
  nextSnoozeAt,
  safeNotificationUrl,
  shiftDailyTime,
} from '../lib/notificationSchedule.ts'

function assert(name: string, ok: boolean) {
  if (!ok) throw new Error(name)
}

const quietOn = {
  ...DEFAULT_NOTIFICATION_PREFS,
  daily_enabled: true,
  daily_time: '20:00',
  quiet_hours_enabled: true,
  quiet_hours_start: 22,
  quiet_hours_end: 8,
}

assert('quiet overnight', isInQuietHours(23, true, 22, 8))
assert('quiet morning', isInQuietHours(7, true, 22, 8))
assert('not quiet afternoon', !isInQuietHours(15, true, 22, 8))
assert('quiet off', !isInQuietHours(23, false, 22, 8))

const wed = new Date(2026, 7, 26, 21, 0, 0)
const tomorrow = nextDailyReminderAt(wed, quietOn, {
  paired: true,
  completedToday: false,
})
assert(
  'after 8pm goes tomorrow',
  tomorrow?.getDate() === 27 && tomorrow?.getHours() === 20,
)

const afterSubmit = nextDailyReminderAt(
  new Date(2026, 7, 26, 10, 0, 0),
  quietOn,
  { paired: true, completedToday: true },
)
assert('no same-day after submit', afterSubmit?.getDate() === 27)

const unpaired = nextDailyReminderAt(
  new Date(2026, 7, 26, 10, 0, 0),
  quietOn,
  { paired: false, completedToday: false },
)
assert('unpaired is off', unpaired === null)

const off = nextDailyReminderAt(
  new Date(2026, 7, 26, 10, 0, 0),
  DEFAULT_NOTIFICATION_PREFS,
  { paired: true, completedToday: false },
)
assert('default off', off === null)

const snoozeQuiet = nextSnoozeAt(new Date(2026, 7, 26, 23, 30, 0), quietOn)
assert(
  'snooze skips quiet hours',
  snoozeQuiet.getDate() === 27 && snoozeQuiet.getHours() === 8,
)

assert('safe url', safeNotificationUrl('/evil') === '/')
assert('allowed url', safeNotificationUrl('/') === '/')
assert('shift wraps', shiftDailyTime('00:00', -30) === '23:30')

console.log('notification schedule ok')
