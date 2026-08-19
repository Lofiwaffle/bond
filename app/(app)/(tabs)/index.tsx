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
import { colors, radii, scoreColors, scoreColorsSoft } from '../../../lib/theme'
import type { DailyCheckIn } from '../../../types/database'

function handleize(name: string): string {
  const raw = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 15)
  return raw.length > 0 ? raw : 'you'
}

function relativeDay(date: string, today: string): string {
  if (date === today) return 'now'
  const [ty, tm, td] = today.split('-').map(Number)
  const [y, m, d] = date.split('-').map(Number)
  const a = Date.UTC(ty, tm - 1, td)
  const b = Date.UTC(y, m - 1, d)
  const days = Math.round((a - b) / 86400000)
  if (days === 1) return '1d'
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.floor(days / 7)}w`
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
  const myHandle = handleize(myName === 'You' ? 'you' : myName)
  const partnerName = partner?.display_name ?? 'Partner'
  const partnerHandle = handleize(partnerName)

  return (
    <Screen style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Entries</Text>
        <StreakChip streak={streak} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {!todayMine ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(app)/check-in')}
            style={styles.composer}
          >
            <View style={[styles.avatar, styles.avatarAccent]}>
              <Text style={styles.avatarLetter}>
                {myName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.composerPlaceholder}>
              How connected do you feel?
            </Text>
            <View style={styles.composerBtn}>
              <Text style={styles.composerBtnText}>Post</Text>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.divider} />

        {feed.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyBody}>
              Check-ins show up here as a shared timeline
              {partner ? ` with @${partnerHandle}` : ''}.
            </Text>
            {!todayMine ? (
              <PrimaryButton
                label="Post your first check-in"
                onPress={() => router.push('/(app)/check-in')}
              />
            ) : null}
          </View>
        ) : (
          feed.map((day) => (
            <TweetThread
              key={day.date}
              day={day}
              today={today}
              myName={myName}
              myHandle={myHandle}
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

function TweetThread({
  day,
  today,
  myName,
  myHandle,
  partnerName,
  partnerHandle,
}: {
  day: HistoryDay
  today: string
  myName: string
  myHandle: string
  partnerName: string
  partnerHandle: string
}) {
  const time = relativeDay(day.date, today)
  const showReply = Boolean(day.revealed && day.partner && day.mine)

  return (
    <View>
      {day.mine ? (
        <Tweet
          name={myName}
          handle={myHandle}
          time={time}
          checkIn={day.mine}
          accent={colors.accent}
          soft={colors.accentSoft}
          showRail={showReply}
          waiting={!day.revealed}
          partnerHandle={partnerHandle}
          onPress={() => router.push(`/(app)/day/${day.date}`)}
        />
      ) : null}

      {day.revealed && day.partner ? (
        <Tweet
          name={partnerName}
          handle={partnerHandle}
          time={time}
          checkIn={day.partner}
          accent={scoreColors[day.partner.score]}
          soft={scoreColorsSoft[day.partner.score]}
          isReply={Boolean(day.mine)}
          replyToHandle={day.mine ? myHandle : undefined}
          onPress={() => router.push(`/(app)/day/${day.date}`)}
        />
      ) : null}

      <View style={styles.divider} />
    </View>
  )
}

function Tweet({
  name,
  handle,
  time,
  checkIn,
  accent,
  soft,
  showRail = false,
  isReply = false,
  replyToHandle,
  waiting = false,
  partnerHandle,
  onPress,
}: {
  name: string
  handle: string
  time: string
  checkIn: DailyCheckIn
  accent: string
  soft: string
  showRail?: boolean
  isReply?: boolean
  replyToHandle?: string
  waiting?: boolean
  partnerHandle?: string
  onPress: () => void
}) {
  const note = checkIn.note?.trim()
  const activities = (checkIn.activities ?? [])
    .map((id) => activityById(id))
    .filter(Boolean)

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tweet, pressed && styles.tweetPressed]}
    >
      <View style={styles.avatarCol}>
        <View style={[styles.avatar, { backgroundColor: soft, borderColor: accent }]}>
          <Text style={[styles.avatarLetter, { color: accent }]}>
            {name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        {showRail ? <View style={styles.rail} /> : null}
      </View>

      <View style={styles.tweetMain}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.handle} numberOfLines={1}>
            @{handle}
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{time}</Text>
        </View>

        {isReply && replyToHandle ? (
          <Text style={styles.replyingTo}>
            Replying to <Text style={styles.replyHandle}>@{replyToHandle}</Text>
          </Text>
        ) : null}

        <View style={styles.vibeRow}>
          <ScoreEmoji score={checkIn.score} size={18} />
          <Text style={styles.tweetText}>
            Feeling{' '}
            <Text style={{ color: accent, fontWeight: '700' }}>
              {SCORE_LABELS[checkIn.score].toLowerCase()}
            </Text>
            {note ? '' : '.'}
          </Text>
        </View>

        {note ? <Text style={styles.tweetText}>{note}</Text> : null}

        {activities.length > 0 ? (
          <Text style={styles.hashtags}>
            {activities
              .map((a) => (a ? `#${a.id}` : null))
              .filter(Boolean)
              .join(' ')}
          </Text>
        ) : null}

        {waiting && partnerHandle ? (
          <Text style={styles.waiting}>
            Waiting for @{partnerHandle} to check in
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Text style={styles.action}>💬</Text>
          <Text style={styles.action}>↻</Text>
          <Text style={styles.action}>♡</Text>
          <Text style={styles.action}>↗</Text>
        </View>
      </View>
    </Pressable>
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
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  topTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  composerPlaceholder: {
    flex: 1,
    color: colors.muted,
    fontSize: 17,
  },
  composerBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  composerBtnText: {
    color: colors.black,
    fontWeight: '800',
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
  },
  tweet: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  tweetPressed: {
    backgroundColor: colors.bgSoft,
  },
  avatarCol: {
    width: 40,
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarAccent: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  avatarLetter: {
    color: colors.accent,
    fontWeight: '800',
    fontSize: 15,
  },
  rail: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -4,
    borderRadius: 1,
    backgroundColor: colors.hairline,
  },
  tweetMain: {
    flex: 1,
    paddingBottom: 8,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap',
  },
  displayName: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 15,
    maxWidth: '42%',
  },
  handle: {
    color: colors.muted,
    fontSize: 15,
    flexShrink: 1,
  },
  dot: {
    color: colors.muted,
    fontSize: 15,
  },
  time: {
    color: colors.muted,
    fontSize: 15,
  },
  replyingTo: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 2,
  },
  replyHandle: {
    color: colors.accent,
  },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tweetText: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
  },
  hashtags: {
    color: colors.accent,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 2,
  },
  waiting: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 24,
    marginTop: 8,
    opacity: 0.55,
  },
  action: {
    color: colors.muted,
    fontSize: 14,
    minWidth: 28,
  },
  empty: {
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 18,
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 8,
  },
  footer: {
    padding: 16,
  },
})
