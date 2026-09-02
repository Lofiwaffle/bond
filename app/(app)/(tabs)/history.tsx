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

import {
  EmptyState,
  LoadingScreen,
  Screen,
  StatusPanel,
  TextLink,
} from '../../../components/ui'
import { FeedAd } from '../../../components/FeedAd'
import { CheckInDayGroup } from '../../../components/CheckInDayFeed'
import {
  useCheckInRange,
  useMonthCheckIns,
  type HistoryDay,
} from '../../../hooks/useCheckIn'
import { useBondPlus } from '../../../hooks/useBondPlus'
import { ACTIVITIES } from '../../../lib/activities'
import { useAuth } from '../../../lib/auth'
import {
  FREE_HISTORY_DAYS,
  PLUS_PAID_CHECKOUT_READY,
  PLUS_TRUST_LINE,
} from '../../../lib/bondPlus'
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

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
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
  const archive = plus.active || !PLUS_PAID_CHECKOUT_READY
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
            <CheckInDayGroup
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
})
