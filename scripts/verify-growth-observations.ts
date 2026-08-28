/**
 * Deterministic Growth observations.
 * Run: npx --yes tsx scripts/verify-growth-observations.ts
 */
import {
  OBSERVATION_MIN_REVEALED,
  buildGrowthObservations,
  observationDaysFromIndex,
  type ObservationDay,
} from '../lib/growthObservations'

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(label)
}

function day(
  date: string,
  mine: number,
  partner: number,
  activities: string[] = [],
): ObservationDay {
  return { date, mine, partner, activities }
}

const tooFew = Array.from({ length: OBSERVATION_MIN_REVEALED - 1 }, (_, i) =>
  day(`2026-01-${String(i + 1).padStart(2, '0')}`, 4, 4),
)
assert(
  'under 14 revealed is quiet',
  buildGrowthObservations(tooFew, '2026-02-01').length === 0,
)

const similar = Array.from({ length: 14 }, (_, i) =>
  day(`2026-03-${String(i + 1).padStart(2, '0')}`, 4, i < 10 ? 4 : 5),
)
const similarObs = buildGrowthObservations(similar, '2026-03-20')
assert(
  'similar count',
  similarObs.some((item) =>
    item.body.includes('similar connection label on 14 of 14 opened days'),
  ),
)
assert(
  'no difference when gaps stay small',
  !similarObs.some((item) => item.id === 'difference'),
)

const twoGaps = [
  ...Array.from({ length: 12 }, (_, i) =>
    day(`2026-03-${String(i + 1).padStart(2, '0')}`, 4, 4),
  ),
  day('2026-03-13', 5, 2),
  day('2026-03-14', 5, 1),
]
const twoGapObs = buildGrowthObservations(twoGaps, '2026-03-20')
assert(
  'two meaningful gaps are below the sample',
  !twoGapObs.some((item) => item.id === 'difference'),
)

const mixed = [
  ...Array.from({ length: 10 }, (_, i) =>
    day(`2026-04-${String(i + 1).padStart(2, '0')}`, 4, 4, ['home']),
  ),
  ...Array.from({ length: 4 }, (_, i) =>
    day(`2026-04-${String(i + 11).padStart(2, '0')}`, 5, 2, ['work']),
  ),
]
const mixedObs = buildGrowthObservations(mixed, '2026-04-20')
assert(
  'similar and difference both report',
  mixedObs.some((item) => item.id === 'similar') &&
    mixedObs.some(
      (item) => item.id === 'difference' && item.body.includes('4 of 14'),
    ),
)
assert(
  'home lifts on connected days',
  mixedObs.some((item) => item.id === 'activities' && item.body.includes('Home')),
)
assert(
  'work does not lift',
  !mixedObs.some((item) => item.body.includes('Work')),
)

const everywhereHome = Array.from({ length: 14 }, (_, i) =>
  day(`2026-07-${String(i + 1).padStart(2, '0')}`, 4, 4, ['home']),
)
const noLiftObs = buildGrowthObservations(everywhereHome, '2026-07-20')
assert(
  'no activity observation without lift',
  !noLiftObs.some((item) => item.id === 'activities'),
)

const filler = Array.from({ length: 4 }, (_, i) =>
  day(`2026-04-${String(i + 1).padStart(2, '0')}`, 3, 3),
)
const prevLow = [
  day('2026-05-02', 2, 2),
  day('2026-05-08', 2, 3),
  day('2026-05-14', 3, 2),
  day('2026-05-20', 2, 2),
  day('2026-05-26', 3, 3),
]
const lastHigh = [
  day('2026-06-02', 4, 4),
  day('2026-06-08', 5, 4),
  day('2026-06-14', 4, 5),
  day('2026-06-20', 4, 4),
  day('2026-06-26', 5, 5),
]
const moreObs = buildGrowthObservations(
  [...filler, ...prevLow, ...lastHigh],
  '2026-06-30',
)
assert(
  'last 30 more connected',
  moreObs.some(
    (item) =>
      item.id === 'window' && item.body.includes('a little more connected'),
  ),
)

const lessObs = buildGrowthObservations(
  [...filler, ...lastHigh.map((item, i) => ({ ...item, date: prevLow[i].date })), ...prevLow.map((item, i) => ({ ...item, date: lastHigh[i].date }))],
  '2026-06-30',
)
assert(
  'last 30 less connected',
  lessObs.some(
    (item) =>
      item.id === 'window' && item.body.includes('a little less connected'),
  ),
)

const shortPrev = buildGrowthObservations(
  [
    ...filler,
    ...prevLow.slice(0, 4),
    ...lastHigh,
    day('2026-04-10', 3, 3),
  ],
  '2026-06-30',
)
assert(
  'omit window when a 30-day sample is short',
  !shortPrev.some((item) => item.id === 'window'),
)

const mapped = observationDaysFromIndex([
  {
    date: '2026-01-01',
    mineScore: 4,
    partnerScore: 4,
    revealed: true,
    activities: ['home'],
  },
  {
    date: '2026-01-02',
    mineScore: 3,
    partnerScore: 5,
    revealed: false,
    activities: ['work'],
  },
])
assert('index mapper keeps revealed only', mapped.length === 1)
assert('index mapper copies scores', mapped[0].mine === 4 && mapped[0].partner === 4)

const banned = /healthy|unhealthy|\bstrong\b|\bweak\b/
for (const item of [...similarObs, ...mixedObs, ...moreObs, ...lessObs]) {
  assert(`no diagnostic language: ${item.body}`, !banned.test(item.body))
  assert('starts with We noticed', item.body.startsWith('We noticed'))
}

console.log('growth observations ok')
