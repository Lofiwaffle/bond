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
  LoadingScreen,
  ScoreMark,
  Screen,
  StreakChip,
} from '../../../components/ui'
import {
  computeStreak,
  useCheckInHistory,
  useTodayCheckIn,
  type HistoryDay,
} from '../../../hooks/useCheckIn'
import { ACTIVITIES } from '../../../lib/activities'
import { useAuth } from '../../../lib/auth'
import { promptForDate } from '../../../lib/dailyPrompts'
import {
  SCORE_LABELS,
  formatDisplayDate,
  localDateString,
} from '../../../lib/dates'
import { colors, hairlineWidth, radii, type } from '../../../lib/theme'
import type { DailyCheckIn } from '../../../types/database'

const AVATAR = 32

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

export default function EntriesScreen() {
  const { profile, partner, isLoading: authLoading } = useAuth()
  const today = localDateString()
  const { days, isLoading, refresh } = useCheckInHistory()
  const { mine: todayMine } = useTodayCheckIn()

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  const streak = useMemo(() => {
    const myDates = days.filter((d) => d.mine).map((d) => d.date)
    return computeStreak(myDates, today)
  }, [days, today])

  const feed = useMemo(
    () => days.filter((d) => d.mine || (d.revealed && d.partner)),
    [days],
  )

  if (authLoading || isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  const myName = profile.display_name?.trim() || 'You'
  const partnerName = partner?.display_name?.trim() || 'Partner'
  const todayPrompt = promptForDate(profile.couple_id, today)

  return (
    <Screen style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Entries</Text>
        <StreakChip streak={streak} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => void refresh()} />
        }
      >
        {!todayMine ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Check in with today's prompt"
            onPress={() => router.push('/(app)/check-in')}
            style={({ pressed }) => [
              styles.composer,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.composerTitle}>{todayPrompt.text}</Text>
            <Text style={styles.composerHint}>
              Today's prompt · tap to check in
            </Text>
          </Pressable>
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
        accessibilityLabel={`${relativeDay(day.date, today)} entries`}
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
          <Text style={styles.waiting}>Waiting for {item.name} to check in</Text>
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
  const note = checkIn.prompt_answer?.trim() || checkIn.note?.trim() || ''
  const activities = checkIn.activities ?? []
  const feeling = SCORE_LABELS[checkIn.score] ?? 'connected'

  return (
    <View style={styles.entryCopy}>
      <View
        accessible
        accessibilityLabel={`${name} feels ${feeling.toLowerCase()}`}
        style={styles.entryLine}
      >
        <Text style={styles.entryMood}>
          <Text style={styles.entryName}>{name}</Text>
          {' feels '}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  topTitle: {
    ...type.heading,
  },
  scroll: {
    paddingBottom: 28,
  },
  composer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  composerTitle: {
    ...type.body,
  },
  composerHint: {
    ...type.label,
    marginTop: 4,
    marginBottom: 0,
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
