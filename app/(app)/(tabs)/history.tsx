import { useCallback, useMemo } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Redirect, router, useFocusEffect } from 'expo-router'
import Svg, { Circle } from 'react-native-svg'

import {
  EmptyState,
  LoadingScreen,
  ScoreMark,
  Screen,
  StatusPanel,
} from '../../../components/ui'
import {
  useCheckInHistory,
  useMonthCheckIns,
  type HistoryDay,
} from '../../../hooks/useCheckIn'
import { ACTIVITIES } from '../../../lib/activities'
import { useAuth } from '../../../lib/auth'
import {
  SCORE_LABELS,
  dateKey,
  formatDisplayDate,
  formatMonthTitle,
  getMonthGrid,
  localDateString,
} from '../../../lib/dates'
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

export default function HistoryScreen() {
  const { profile, partner, isLoading: authLoading } = useAuth()
  const today = localDateString()
  const now = useMemo(() => new Date(), [])
  const year = now.getFullYear()
  const month = now.getMonth()
  const { days, isLoading, error, refresh } = useCheckInHistory()
  const { byDate } = useMonthCheckIns(year, month)

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  const feed = useMemo(
    () => days.filter((d) => d.mine || (d.revealed && d.partner)),
    [days],
  )

  if (authLoading || isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  const myName = profile.display_name?.trim() || 'You'
  const partnerName = partner?.display_name?.trim() || 'Partner'
  const grid = getMonthGrid(year, month)

  return (
    <Screen style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>History</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => void refresh()} />
        }
      >
        <Text style={styles.monthTitle}>{formatMonthTitle(year, month)}</Text>
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
            const saved = Boolean(slot?.mine)
            const opened = Boolean(slot?.revealed)
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${formatDisplayDate(key)}${saved ? ', checked in' : ''}${opened ? ', open' : ''}`}
                onPress={() => router.push(`/(app)/day/${key}`)}
                style={styles.matrixSlot}
              >
                <View
                  style={[
                    styles.matrixDay,
                    saved && styles.matrixSaved,
                    opened && styles.matrixOpened,
                    key === today && styles.matrixToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.matrixLabel,
                      saved && styles.matrixLabelOn,
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

        {error ? (
          <StatusPanel
            message="Couldn't load your history."
            onRetry={() => void refresh()}
          />
        ) : null}

        {!error && feed.length === 0 ? (
          <EmptyState
            title="No days yet"
            body="Today holds the check-in. Past days will collect here."
            actionLabel="Go to Today"
            onAction={() => router.push('/(app)/(tabs)')}
          />
        ) : null}

        {feed.map((day) => (
          <DayGroup
            key={day.date}
            day={day}
            today={today}
            myName={myName}
            partnerName={partner ? partnerName : null}
            myInitial={initialOf(myName)}
            partnerInitial={initialOf(partnerName)}
          />
        ))}
      </ScrollView>
    </Screen>
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
  monthTitle: {
    ...type.label,
    paddingHorizontal: 20,
    marginBottom: 8,
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
