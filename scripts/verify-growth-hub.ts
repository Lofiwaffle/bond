/**
 * Growth home shows one weekly insight; tools live in the hub.
 * Run: npx --yes tsx scripts/verify-growth-hub.ts
 */
import {
  daysUntilFirstLook,
  growthUnlocks,
  pickWeeklyInsight,
  unlockedGrowthItems,
} from '../lib/nextStep'
import { MUTUAL_REVEAL_BODY, MUTUAL_REVEAL_TITLE } from '../lib/privacy'
import {
  SAVED_WAITING_TO_SYNC,
  checkInSyncMessage,
} from '../lib/checkInOutbox'

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(label)
}

assert('three days until first look', daysUntilFirstLook(0) === 3)
assert('zero after three', daysUntilFirstLook(3) === 0)

const locked = pickWeeklyInsight({
  needsReview: false,
  insightTitle: null,
  insightBody: null,
  remaining: 2,
})
assert('locked is not a tool list', locked.title.includes('weekly look'))
assert('locked sends people to Today', locked.href === '/(app)/(tabs)')

const reading = pickWeeklyInsight({
  needsReview: false,
  insightTitle: 'A first look',
  insightBody: 'You both often chose a similar label.',
  remaining: 0,
})
assert('reading has no destination', reading.href === undefined)
assert('reading is this week', reading.kicker === 'This week')

const review = pickWeeklyInsight({
  needsReview: true,
  insightTitle: 'A first look',
  insightBody: 'You both often chose a similar label.',
  remaining: 0,
})
assert('review wins over reading', review.href === '/(app)/weekly-review')

const unlocks = growthUnlocks({
  myCheckIns: 10,
  revealedDays: 8,
  weeklyUnlocked: true,
})
const hub = unlockedGrowthItems(unlocks, { revealedDays: 8 })
assert(
  'hub has the tools',
  ['patterns', 'goals', 'achievements', 'weekly', 'prompts'].every((id) =>
    hub.some((item) => item.id === id),
  ),
)

assert(
  'queued copy is device-first',
  SAVED_WAITING_TO_SYNC === 'Saved on this device, waiting to sync.',
)
assert(
  'queued banner is not a retry',
  checkInSyncMessage({ queued: true, online: false })?.title ===
    SAVED_WAITING_TO_SYNC,
)
assert(
  'online queued still waiting',
  checkInSyncMessage({ queued: true, online: true })?.title ===
    SAVED_WAITING_TO_SYNC,
)
assert(
  'syncing is explicit',
  checkInSyncMessage({ queued: true, syncing: true, online: true })?.title ===
    'Sending your check-in now.',
)
assert(
  'online and clear is quiet',
  checkInSyncMessage({ queued: false, online: true }) === null,
)
assert(
  'offline after save is quiet',
  checkInSyncMessage({ queued: false, online: false, allowDraft: false }) ===
    null,
)

assert('first-run title names the rule', MUTUAL_REVEAL_TITLE.includes('cannot see'))
assert(
  'first-run body is mutual reveal',
  MUTUAL_REVEAL_BODY.includes('until they check in too'),
)

console.log('growth hub, sync copy, and first-run rule ok')
