import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import {
  LoadingScreen,
  PrimaryButton,
  ScoreEmoji,
  Screen,
  SecondaryButton,
  StreakChip,
} from '../../../components/ui'
import {
  computeStreak,
  useCheckInHistory,
  useTodayCheckIn,
  type HistoryDay,
} from '../../../hooks/useCheckIn'
import { activityById } from '../../../lib/activities'
import { useAuth } from '../../../lib/auth'
import {
  SCORE_LABELS,
  formatDisplayDate,
  localDateString,
} from '../../../lib/dates'
import { colors, elevation, radii, scoreColors, scoreColorsSoft } from '../../../lib/theme'
import type { DailyCheckIn } from '../../../types/database'

function relativeDay(date: string, today: string): string {
  if (date === today) return 'Today'
  const [ty, tm, td] = today.split('-').map(Number)
  const [y, m, d] = date.split('-').map(Number)
  const a = Date.UTC(ty, tm - 1, td)
  const b = Date.UTC(y, m - 1, d)
  const days = Math.round((a - b) / 86400000)
  if (days === 1) return 'Yesterday'
  if (days < 7) return formatDisplayDate(date)
  return formatDisplayDate(date)
}

export default function EntriesScreen() {
  const { profile, partner, isLoading: authLoading } = useAuth()
  const today = localDateString()
  const { days, isLoading, refresh } = useCheckInHistory()
  const { mine: todayMine } = useTodayCheckIn()

  const streak = useMemo(() => {
    const myDates = days.filter((d) => d.mine).map((d) => d.date)
    return computeStreak(myDates, today)
  }, [days, today])

  const feed = useMemo(
    () => days.filter((d) => d.mine || (d.revealed && d.partner)),
    [days],
  )

  if (authLoading || isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/pair" />

  const myName = profile.display_name?.trim() || 'You'
  const partnerName = partner?.display_name ?? 'Partner'
  const partnerHandle = partnerName

  return (
    <Screen style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Entries</Text>
        <StreakChip streak={streak} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {!todayMine ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(app)/check-in')}
            style={({ pressed }) => [
              styles.composer,
              pressed && styles.composerPressed,
            ]}
          >
            <View style={styles.composerFaces}>
              <Text style={styles.composerFace}>🙂</Text>
              <Text style={styles.composerFace}>😄</Text>
            </View>
            <View style={styles.composerCopy}>
              <Text style={styles.composerTitle}>How connected do you feel?</Text>
              <Text style={styles.composerHint}>Tap to check in for today</Text>
            </View>
            <View style={styles.composerBtn}>
              <Text style={styles.composerBtnText}>Go</Text>
            </View>
          </Pressable>
        ) : null}

        {feed.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyGlyph}>☺</Text>
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyBody}>
              Your check-ins will show up here as a shared timeline
              {partner ? ` with ${partnerName}` : ''}.
            </Text>
            {!todayMine ? (
              <PrimaryButton
                label="Check in for the first time"
                onPress={() => router.push('/(app)/check-in')}
              />
            ) : null}
          </View>
        ) : (
          feed.map((day) => (
            <EntryCard
              key={day.date}
              day={day}
              today={today}
              myName={myName}
              partnerName={partnerName}
              partnerHandle={partnerHandle}
            />
          ))
        )}

        <View style={styles.footer}>
          <SecondaryButton label="Refresh" onPress={() => void refresh()} />
        </View>
      </ScrollView>
    </Screen>
  )
}

function EntryCard({
  day,
  today,
  myName,
  partnerName,
  partnerHandle,
}: {
  day: HistoryDay
  today: string
  myName: string
  partnerName: string
  partnerHandle: string
}) {
  const time = relativeDay(day.date, today)

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/(app)/day/${day.date}`)}
      style={({ pressed }) => [styles.entryCard, pressed && styles.entryPressed]}
    >
      {day.mine ? (
        <EntryRow
          name={myName}
          time={time}
          checkIn={day.mine}
          waiting={!day.revealed}
          partnerHandle={partnerHandle}
        />
      ) : null}

      {day.revealed && day.partner ? (
        <View style={day.mine ? styles.partnerBlock : undefined}>
          <EntryRow
            name={partnerName}
            time={time}
            checkIn={day.partner}
            isPartner
          />
        </View>
      ) : null}
    </Pressable>
  )
}

function EntryRow({
  name,
  time,
  checkIn,
  waiting = false,
  partnerHandle,
  isPartner = false,
}: {
  name: string
  time: string
  checkIn: DailyCheckIn
  waiting?: boolean
  partnerHandle?: string
  isPartner?: boolean
}) {
  const note = checkIn.note?.trim()
  const activities = (checkIn.activities ?? [])
    .map((id) => activityById(id))
    .filter(Boolean)
  const scoreColor = scoreColors[checkIn.score]
  const scoreSoft = scoreColorsSoft[checkIn.score]

  return (
    <View style={styles.entryRow}>
      <View style={[styles.moodBubble, { backgroundColor: scoreSoft }]}>
        <ScoreEmoji score={checkIn.score} size={isPartner ? 28 : 34} />
      </View>

      <View style={styles.entryMain}>
        <View style={styles.entryMeta}>
          <Text style={styles.entryName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.entryTime}>{time}</Text>
        </View>
        <Text style={styles.entryMood}>
          Feeling{' '}
          <Text style={{ color: scoreColor, fontWeight: '700' }}>
            {SCORE_LABELS[checkIn.score].toLowerCase()}
          </Text>
        </Text>
        {note ? <Text style={styles.entryNote}>{note}</Text> : null}
        {activities.length > 0 ? (
          <View style={styles.chipRow}>
            {activities.map((activity) =>
              activity ? (
                <View
                  key={activity.id}
                  style={[styles.chip, { backgroundColor: activity.tint }]}
                >
                  <Text style={styles.chipText}>
                    {activity.glyph} {activity.label}
                  </Text>
                </View>
              ) : null,
            )}
          </View>
        ) : null}
        {waiting && partnerHandle ? (
          <Text style={styles.waiting}>Waiting for {partnerHandle} to check in</Text>
        ) : null}
      </View>
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
    paddingBottom: 12,
  },
  topTitle: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 14,
    ...elevation.card,
  },
  composerPressed: {
    transform: [{ scale: 0.99 }],
  },
  composerFaces: {
    flexDirection: 'row',
    marginLeft: -4,
  },
  composerFace: {
    fontSize: 22,
    marginLeft: -4,
  },
  composerCopy: {
    flex: 1,
  },
  composerTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  composerHint: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  composerBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  composerBtnText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 14,
  },
  entryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 12,
    ...elevation.card,
  },
  entryPressed: {
    opacity: 0.92,
  },
  partnerBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  entryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  moodBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryMain: {
    flex: 1,
    gap: 4,
    paddingTop: 2,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  entryName: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
  },
  entryTime: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  entryMood: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
  },
  entryNote: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '600',
  },
  waiting: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  empty: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 28,
    alignItems: 'center',
    marginTop: 4,
  },
  emptyGlyph: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 18,
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  footer: {
    paddingTop: 8,
  },
})
