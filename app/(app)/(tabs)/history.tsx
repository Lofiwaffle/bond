import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { Redirect, router, useFocusEffect, type Href } from 'expo-router'
import Svg, { Circle } from 'react-native-svg'

import {
  EmptyState,
  LoadingScreen,
  ScoreMark,
  Screen,
  StatusPanel,
  TextLink,
} from '../../../components/ui'
import { FeedAd } from '../../../components/FeedAd'
import {
  useCheckInRange,
  useMonthCheckIns,
  type HistoryDay,
} from '../../../hooks/useCheckIn'
import { useBondPlus } from '../../../hooks/useBondPlus'
import { ACTIVITIES } from '../../../lib/activities'
import { useAuth } from '../../../lib/auth'
import { FREE_HISTORY_DAYS, PLUS_TRUST_LINE } from '../../../lib/bondPlus'
import { shouldInsertFeedAd, shouldShowAds } from '../../../lib/ads'
import {
  SCORE_LABELS,
  addMonths,
  addDays,
  dateKey,
  formatDisplayDate,
  formatMonthTitle,
  getMonthGrid,
  localDateString,
  monthFromDate,
} from '../../../lib/dates'
import {
  isViewingCurrentMonth,
  readHistoryView,
  writeHistoryView,
} from '../../../lib/historyView'
import { Icon } from '../../../lib/icons'
import { useAccessibleLayout } from '../../../lib/a11y'
import { colors, hairlineWidth, hit, radii, type } from '../../../lib/theme'
import type { DailyCheckIn } from '../../../types/database'

const AVATAR = 32
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function relativeDay(date: string, today: string): string {
  if (date === today) return 'Today'
  const [ty, tm, td] = today.split('-').map(Number)
  const [y, m, d] = date.split('-').map(Number)
  const a = Date.UTC(ty, tm - 1, td)
  const b = Date.UTC(y, m - 1, d)
  const days = Math.round((a - b) / 86400000)
  if (days === 1) return 'Yesterday'
  return formatDisplayDate(date)
}

function monthValue(year: number, month: number): number {
  return year * 12 + month
}

function dayMatches(
  day: HistoryDay,
  score: number | null,
  activity: string | null,
): boolean {
  const visible = [day.mine, day.revealed ? day.partner : null].filter(
    (row): row is DailyCheckIn => Boolean(row),
  )
  if (score != null && !visible.some((row) => row.score === score)) return false
  if (
    activity &&
    !visible.some((row) => (row.activities ?? []).includes(activity))
  ) {
    return false
  }
  return true
}

export default function HistoryScreen() {
  const { profile, partner, couple, isLoading: authLoading } = useAuth()
  const plus = useBondPlus()
  const { compactVisual, highContrast, border } = useAccessibleLayout()
  const today = localDateString()
  const now = monthFromDate(today)
  const saved = readHistoryView()
  const [year, setYear] = useState(saved.year)
  const [month, setMonth] = useState(saved.month)
  const [scoreFilter, setScoreFilter] = useState<number | null>(saved.score)
  const [activityFilter, setActivityFilter] = useState<string | null>(
    saved.activity,
  )
  const monthQuery = useMonthCheckIns(year, month)
  const recentQuery = useCheckInRange(
    addDays(today, -(FREE_HISTORY_DAYS - 1)),
    today,
  )
  const archive = plus.active
  const { days, isLoading, error, refresh } = archive ? monthQuery : recentQuery
  const byDate = archive
    ? monthQuery.byDate
    : Object.fromEntries(recentQuery.days.map((day) => [day.date, day]))
  const scrollRef = useRef<ScrollView>(null)
  const pendingScroll = useRef(saved.scrollY)
  const ignoreScroll = useRef(false)

  const earliest = monthFromDate(
    localDateString(
      couple?.paired_at
        ? new Date(couple.paired_at)
        : couple?.created_at
          ? new Date(couple.created_at)
          : new Date(),
    ),
  )

  const canPrev = monthValue(year, month) > monthValue(earliest.year, earliest.month)
  const canNext = monthValue(year, month) < monthValue(now.year, now.month)
  const viewingToday = isViewingCurrentMonth(year, month, today)

  const goToMonth = (nextYear: number, nextMonth: number) => {
    ignoreScroll.current = true
    pendingScroll.current = 0
    writeHistoryView({ year: nextYear, month: nextMonth, scrollY: 0 })
    setYear(nextYear)
    setMonth(nextMonth)
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false })
      ignoreScroll.current = false
    })
  }

  useFocusEffect(
    useCallback(() => {
      void refresh()
      const y = readHistoryView().scrollY
      pendingScroll.current = y
      const id = requestAnimationFrame(() => {
        if (y > 0) scrollRef.current?.scrollTo({ y, animated: false })
      })
      return () => cancelAnimationFrame(id)
    }, [refresh]),
  )

  const feed = useMemo(
    () =>
      days.filter(
        (d) =>
          (d.mine || (d.revealed && d.partner)) &&
          dayMatches(d, scoreFilter, activityFilter),
      ),
    [activityFilter, days, scoreFilter],
  )

  if (authLoading || plus.isLoading || (isLoading && days.length === 0 && !error)) {
    return <LoadingScreen />
  }
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  const myName = profile.display_name?.trim() || 'You'
  const partnerName = partner?.display_name?.trim() || 'Partner'
  const grid = getMonthGrid(year, month)
  const filtersOn = scoreFilter != null || activityFilter != null

  return (
    <Screen style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>History</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          if (ignoreScroll.current) return
          writeHistoryView({
            scrollY: event.nativeEvent.contentOffset.y,
          })
        }}
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          const y = pendingScroll.current
          if (y > 0) {
            scrollRef.current?.scrollTo({ y, animated: false })
          }
        }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => void refresh()} />
        }
      >
        {archive ? (
          <>
        <View style={styles.monthNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            accessibilityState={{ disabled: !canPrev }}
            disabled={!canPrev}
            onPress={() => {
              const next = addMonths(year, month, -1)
              goToMonth(next.year, next.month)
            }}
            style={[styles.monthShift, !canPrev && styles.monthShiftOff]}
          >
            <Icon name="chevron-left" size={18} color={colors.ink} />
          </Pressable>
          <Text style={styles.monthTitle}>{formatMonthTitle(year, month)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            accessibilityState={{ disabled: !canNext }}
            disabled={!canNext}
            onPress={() => {
              const next = addMonths(year, month, 1)
              goToMonth(next.year, next.month)
            }}
            style={[styles.monthShift, !canNext && styles.monthShiftOff]}
          >
            <Icon name="chevron-right" size={18} color={colors.ink} />
          </Pressable>
        </View>
        {viewingToday ? null : (
          <View style={styles.returnRow}>
            <TextLink
              label="Return to today"
              onPress={() => goToMonth(now.year, now.month)}
            />
          </View>
        )}

        <View style={styles.filterBlock}>
          <Text style={styles.filterLabel}>Connection</Text>
          <View style={styles.filterRow}>
            <FilterChip
              label="Any"
              selected={scoreFilter == null}
              onPress={() => {
                setScoreFilter(null)
                writeHistoryView({ score: null })
              }}
            />
            {([1, 2, 3, 4, 5] as const).map((score) => (
              <FilterChip
                key={score}
                label={SCORE_LABELS[score]}
                selected={scoreFilter === score}
                onPress={() => {
                  const next = scoreFilter === score ? null : score
                  setScoreFilter(next)
                  writeHistoryView({ score: next })
                }}
              />
            ))}
          </View>
          <Text style={styles.filterLabel}>Activity</Text>
          <View style={styles.filterRow}>
            <FilterChip
              label="Any"
              selected={activityFilter == null}
              onPress={() => {
                setActivityFilter(null)
                writeHistoryView({ activity: null })
              }}
            />
            {ACTIVITIES.map((activity) => (
              <FilterChip
                key={activity.id}
                label={activity.label}
                selected={activityFilter === activity.id}
                onPress={() => {
                  const next =
                    activityFilter === activity.id ? null : activity.id
                  setActivityFilter(next)
                  writeHistoryView({ activity: next })
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.weekday}>
              {label}
            </Text>
          ))}
        </View>
        <View style={styles.matrix}>
          {grid.map((day, index) => {
            if (day == null) {
              return <View key={`e-${index}`} style={styles.matrixSlot} />
            }
            const key = dateKey(year, month, day)
            const slot = byDate[key]
            const savedDay = Boolean(slot?.mine)
            const opened = Boolean(slot?.revealed)
            const dimmed =
              Boolean(slot) && !dayMatches(slot, scoreFilter, activityFilter)
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${formatDisplayDate(key)}${savedDay ? ', checked in' : ''}${opened ? ', open' : ''}`}
                onPress={() => router.push(`/(app)/day/${key}`)}
                style={styles.matrixSlot}
              >
                <View
                  style={[
                    styles.matrixDay,
                    {
                      width: compactVisual,
                      height: compactVisual,
                      borderRadius: compactVisual / 2,
                      borderColor: highContrast ? border : undefined,
                      borderWidth: highContrast && !savedDay ? 2 : undefined,
                    },
                    savedDay && styles.matrixSaved,
                    opened && styles.matrixOpened,
                    key === today && styles.matrixToday,
                    dimmed && styles.matrixDim,
                  ]}
                >
                  <Text
                    style={[
                      styles.matrixLabel,
                      savedDay && styles.matrixLabelOn,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
        <Text style={styles.legend}>
          Filled days are yours. A ring means the day is open for both of you.
        </Text>
          </>
        ) : (
          <>
            <Text style={styles.monthTitle}>Last seven days</Text>
            <Text style={styles.legend}>{PLUS_TRUST_LINE}</Text>
            <TextLink
              label="Complete history with Bond Plus"
              onPress={() => router.push('/(app)/plus' as Href)}
            />
          </>
        )}

        {error ? (
          <StatusPanel
            message={
              archive ? "Couldn't load this month." : "Couldn't load recent days."
            }
            onRetry={() => void refresh()}
          />
        ) : null}

        {!error && feed.length === 0 ? (
          <EmptyState
            title={filtersOn ? 'Nothing matches' : archive ? 'No days this month' : 'No days this week'}
            body={
              filtersOn
                ? 'Try another connection label or activity, or clear the filters.'
                : archive
                  ? viewingToday
                    ? 'Today holds the check-in. Past months stay on the arrows.'
                    : 'Nothing was saved in this month.'
                  : 'Check-ins from the last seven days show up here. Older opened days stay readable if you open them.'
            }
            actionLabel={
              filtersOn
                ? 'Clear filters'
                : viewingToday
                  ? 'Go to Today'
                  : 'Return to today'
            }
            onAction={() => {
              if (filtersOn) {
                setScoreFilter(null)
                setActivityFilter(null)
                writeHistoryView({ score: null, activity: null })
                return
              }
              if (viewingToday) {
                router.push('/(app)/(tabs)')
                return
              }
              goToMonth(now.year, now.month)
            }}
          />
        ) : null}

        {feed.map((day, index) => (
          <View key={day.date}>
            {plus.isLoading || !shouldShowAds(plus.active)
              ? null
              : shouldInsertFeedAd(index)
                ? <FeedAd />
                : null}
            <DayGroup
              day={day}
              today={today}
              myName={myName}
              partnerName={partner ? partnerName : null}
              myInitial={initialOf(myName)}
              partnerInitial={initialOf(partnerName)}
            />
          </View>
        ))}
      </ScrollView>
    </Screen>
  )
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={(state) => [
        styles.filterChip,
        selected && styles.filterChipOn,
        state.pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.filterChipLabel, selected && styles.filterChipLabelOn]}>
        {label}
      </Text>
    </Pressable>
  )
}

function DayGroup({
  day,
  today,
  myName,
  partnerName,
  myInitial,
  partnerInitial,
}: {
  day: HistoryDay
  today: string
  myName: string
  partnerName: string | null
  myInitial: string
  partnerInitial: string
}) {
  const rows: TimelineItem[] = []

  if (day.mine) {
    rows.push({
      key: 'mine',
      tone: 'self',
      name: myName,
      initial: myInitial,
      checkIn: day.mine,
    })
  }

  if (day.revealed && day.partner) {
    rows.push({
      key: 'partner',
      tone: 'partner',
      name: partnerName ?? 'Partner',
      initial: partnerInitial,
      checkIn: day.partner,
    })
  } else if (day.mine && partnerName) {
    rows.push({
      key: 'waiting',
      tone: 'waiting',
      name: partnerName,
      initial: partnerInitial,
    })
  } else if (!day.mine && day.revealed && day.partner) {
    rows.push({
      key: 'partner',
      tone: 'partner',
      name: partnerName ?? 'Partner',
      initial: partnerInitial,
      checkIn: day.partner,
    })
  }

  return (
    <View>
      <DateRule label={relativeDay(day.date, today)} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${relativeDay(day.date, today)} history`}
        onPress={() => router.push(`/(app)/day/${day.date}`)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {rows.map((row, index) => (
          <TimelineRow
            key={row.key}
            item={row}
            connect={index < rows.length - 1}
          />
        ))}
      </Pressable>
    </View>
  )
}

type TimelineItem = {
  key: string
  tone: 'self' | 'partner' | 'waiting'
  name: string
  initial: string
  checkIn?: DailyCheckIn
}

function TimelineRow({
  item,
  connect,
}: {
  item: TimelineItem
  connect: boolean
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.rail}>
        <TimelineAvatar initial={item.initial} tone={item.tone} />
        {connect ? <View style={styles.connector} /> : null}
      </View>
      <View style={styles.entryBody}>
        {item.tone === 'waiting' || !item.checkIn ? (
          <Text style={styles.waiting}>
            {item.name} has not checked in yet. Yours stays private.
          </Text>
        ) : (
          <EntryCopy name={item.name} checkIn={item.checkIn} />
        )}
      </View>
    </View>
  )
}

function EntryCopy({
  name,
  checkIn,
}: {
  name: string
  checkIn: DailyCheckIn
}) {
  const note = checkIn.prompt_answer?.trim() || ''
  const activities = checkIn.activities ?? []
  const feeling = SCORE_LABELS[checkIn.score] ?? 'connected'

  return (
    <View style={styles.entryCopy}>
      <View
        accessible
        accessibilityLabel={`${name} checked in as ${feeling.toLowerCase()}`}
        style={styles.entryLine}
      >
        <Text style={styles.entryMood}>
          <Text style={styles.entryName}>{name}</Text>
          {' · '}
        </Text>
        <ScoreMark score={checkIn.score} size={22} />
      </View>
      {note ? <Text style={styles.entryNote}>{note}</Text> : null}
      <EntryChips ids={activities} />
    </View>
  )
}

function EntryChips({ ids }: { ids: string[] }) {
  if (!ids.length) return null
  return (
    <View style={styles.chipWrap}>
      {ids.map((id) => {
        const activity = ACTIVITIES.find((item) => item.id === id)
        if (!activity) return null
        return (
          <View key={id} style={styles.chip}>
            <Text style={styles.chipLabel}>{activity.label}</Text>
          </View>
        )
      })}
    </View>
  )
}

function DateRule({ label }: { label: string }) {
  return (
    <View style={styles.dateRule}>
      <View style={styles.dateLine} />
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateLine} />
    </View>
  )
}

function TimelineAvatar({
  initial,
  tone,
}: {
  initial: string
  tone: 'self' | 'partner' | 'waiting'
}) {
  if (tone === 'waiting') {
    const r = AVATAR / 2 - 1
    return (
      <View style={styles.avatarSlot}>
        <Svg width={AVATAR} height={AVATAR}>
          <Circle
            cx={AVATAR / 2}
            cy={AVATAR / 2}
            r={r}
            stroke={colors.muted}
            strokeWidth={1}
            strokeDasharray="3 2.5"
            fill="none"
          />
        </Svg>
        <View style={styles.waitingLetterWrap}>
          <Text style={styles.waitingLetter}>{initial}</Text>
        </View>
      </View>
    )
  }

  return (
    <View
      style={[
        styles.avatar,
        tone === 'self' ? styles.avatarSelf : styles.avatarPartner,
      ]}
    >
      <Text style={styles.avatarLetter}>{initial}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  topTitle: {
    ...type.heading,
  },
  scroll: {
    paddingBottom: 28,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  monthShift: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthShiftOff: {
    opacity: 0.3,
  },
  monthTitle: {
    ...type.label,
    flex: 1,
    textAlign: 'center',
    marginBottom: 0,
  },
  returnRow: {
    paddingHorizontal: 20,
    marginBottom: 8,
    alignItems: 'center',
  },
  filterBlock: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterLabel: {
    ...type.label,
    marginBottom: 8,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.pill,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterChipOn: {
    backgroundColor: colors.accentFill,
    borderColor: colors.accentFill,
  },
  filterChipLabel: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
  filterChipLabelOn: {
    color: colors.onAccent,
  },
  matrixDim: {
    opacity: 0.35,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    ...type.label,
    marginBottom: 0,
  },
  matrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  matrixSlot: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: hit,
  },
  matrixDay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSoft,
  },
  matrixSaved: {
    backgroundColor: colors.ink,
  },
  matrixOpened: {
    borderWidth: 2,
    borderColor: colors.accentFill,
  },
  matrixToday: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  matrixLabel: {
    ...type.label,
    color: colors.muted,
    marginBottom: 0,
  },
  matrixLabelOn: {
    color: colors.white,
  },
  legend: {
    ...type.label,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  dateRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  dateLine: {
    flex: 1,
    height: hairlineWidth,
    backgroundColor: colors.hairline,
  },
  dateLabel: {
    ...type.label,
    marginBottom: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 20,
    gap: 12,
  },
  rail: {
    width: AVATAR,
    alignItems: 'center',
  },
  connector: {
    width: hairlineWidth,
    flex: 1,
    backgroundColor: colors.hairline,
    marginTop: 4,
    minHeight: 16,
  },
  avatarSlot: {
    width: AVATAR,
    height: AVATAR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelf: {
    backgroundColor: colors.accent,
  },
  avatarPartner: {
    backgroundColor: colors.success,
  },
  avatarLetter: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.ink,
  },
  waitingLetterWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingLetter: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.muted,
  },
  entryBody: {
    flex: 1,
    paddingBottom: 16,
  },
  entryCopy: {
    gap: 6,
  },
  entryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryName: {
    ...type.body,
    fontWeight: '500',
  },
  entryMood: {
    ...type.body,
  },
  entryNote: {
    ...type.body,
  },
  waiting: {
    ...type.body,
    color: colors.muted,
    paddingTop: 6,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipLabel: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
})
