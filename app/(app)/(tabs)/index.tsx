import { useCallback, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, useFocusEffect } from 'expo-router'

import { NextStepCard } from '../../../components/NextStepCard'
import { PlusOfferCard } from '../../../components/PlusOfferCard'
import { CheckInDayFeed } from '../../../components/CheckInDayFeed'
import { SharedActionCard } from '../../../components/CheckInMoment'
import { CheckInSyncBanner } from '../../../components/CheckInSyncBanner'
import { LoadingScreen, Screen, StatusPanel, TextLink } from '../../../components/ui'
import {
  useTodayCheckIn,
  useCheckInGrowth,
  useCheckInIndex,
  useCheckInRange,
  type HistoryDay,
} from '../../../hooks/useCheckIn'
import { useBondPlus } from '../../../hooks/useBondPlus'
import { useDailyAction } from '../../../hooks/useDailyAction'
import { useNotificationPreferences } from '../../../hooks/useNotificationPreferences'
import { useAuth } from '../../../lib/auth'
import { promptForDate } from '../../../lib/dailyPrompts'
import { addDays, formatDisplayDate, localDateString } from '../../../lib/dates'
import { useQueuedCheckIn } from '../../../lib/checkInOutbox'
import { useOnline } from '../../../lib/network'
import { firstInsight } from '../../../lib/firstInsight'
import { observationDaysFromIndex } from '../../../lib/growthObservations'
import { todayPhase } from '../../../lib/nextStep'
import { welcomeBackCopy } from '../../../lib/rhythm'
import { useToast } from '../../../lib/toast'
import { colors, type } from '../../../lib/theme'
import { formatClockLabel } from '../../../lib/notificationSchedule'

export default function TodayScreen() {
  const { user, profile, partner, isLoading: authLoading } = useAuth()
  const {
    mine,
    partnerCheckIn,
    bothSubmitted,
    waitingForPartner,
    isLoading,
    error,
    refresh,
    syncing,
  } = useTodayCheckIn()
  const { myCheckIns, lastDate } = useCheckInGrowth()
  const { days: indexDays } = useCheckInIndex()
  const plus = useBondPlus()
  const { accepted } = useDailyAction()
  const { remindInOneHour } = useNotificationPreferences()
  const { showToast } = useToast()
  const [snoozing, setSnoozing] = useState(false)
  const today = localDateString()
  const queued = useQueuedCheckIn(user?.id, today)
  const online = useOnline()
  const feedQuery = useCheckInRange(addDays(today, -180), today)

  const insight = useMemo(
    () => firstInsight(observationDaysFromIndex(indexDays)),
    [indexDays],
  )
  const feed = useMemo(() => {
    const byDate = new Map<string, HistoryDay>()
    for (const day of feedQuery.days) {
      if (day.mine || (day.revealed && day.partner)) {
        byDate.set(day.date, day)
      }
    }
    if (mine) {
      byDate.set(today, {
        date: today,
        mine,
        partner: partnerCheckIn,
        revealed: bothSubmitted,
      })
    }
    return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
  }, [bothSubmitted, feedQuery.days, mine, partnerCheckIn, today])

  useFocusEffect(
    useCallback(() => {
      void refresh()
      void feedQuery.refresh()
    }, [feedQuery.refresh, refresh]),
  )

  if (authLoading || isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  const partnerName = partner?.display_name?.trim() || 'your person'
  const phase = todayPhase({
    hasMine: Boolean(mine),
    waitingForPartner,
    bothSubmitted,
  })
  const prompt = promptForDate(profile.couple_id, today)
  const gapDays = lastDate
    ? Math.max(
        0,
        Math.round(
          (Date.parse(`${today}T00:00:00`) -
            Date.parse(`${lastDate}T00:00:00`)) /
            86400000,
        ),
      )
    : 0
  const returning = !mine
    ? welcomeBackCopy({
        daysConnected: myCheckIns,
        daysOpen: 0,
        stretch: 0,
        lastDate,
        gapDays,
        welcomeBack: gapDays >= 2,
      })
    : null

  const onSnooze = async () => {
    if (snoozing || mine) return
    setSnoozing(true)
    const result = await remindInOneHour()
    setSnoozing(false)
    if (result.error) {
      showToast(result.error)
      return
    }
    if (result.when) {
      showToast(`We'll nudge you around ${formatClockLabel(result.when)}.`)
    }
  }

  return (
    <Screen style={styles.screen} keyboard>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topTitle}>Today</Text>
          <Text style={styles.date}>{formatDisplayDate(today)}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              void refresh()
              void feedQuery.refresh()
            }}
          />
        }
      >
        {error && !queued ? (
          <StatusPanel
            message="Couldn't load today."
            onRetry={() => void refresh()}
          />
        ) : null}

        <CheckInSyncBanner
          queued={queued}
          syncing={syncing}
          online={online}
          allowDraft={phase === 'compose'}
        />

        <View style={styles.padded}>
        {accepted
          .filter(
            (action) => phase !== 'reveal' || action.check_in_date !== today,
          )
          .map((action) => (
            <SharedActionCard
              key={action.id}
              action={action}
              partnerName={partnerName}
              userId={user?.id ?? ''}
            />
          ))}

        {phase === 'compose' ? (
          <>
            <NextStepCard
              kicker="Today's prompt"
              title={prompt.text}
              body={
                queued
                  ? 'Today is queued on this device. It is not in the relationship until Bond confirms it.'
                  : returning ??
                    'Two minutes. Private until you both check in.'
              }
              actionLabel={queued ? 'Review check-in' : 'Check in'}
              onAction={() => router.push('/(app)/check-in')}
            />
            <TextLink
              label={
                snoozing ? 'Setting reminder...' : 'Remind me in one hour'
              }
              onPress={() => void onSnooze()}
              disabled={snoozing}
            />
          </>
        ) : null}

        {phase === 'waiting' && mine && !partner ? (
          <NextStepCard
            kicker="Saved"
            title="Your check-in is safe."
            body="Invite your person from Us when you are ready. There is no rush."
          />
        ) : null}

        {plus.offerEligible && insight ? (
          <PlusOfferCard
            insight={insight}
            onNotNow={() => void plus.snoozeOffer()}
          />
        ) : null}
        </View>

        <View style={styles.feed}>
          {feedQuery.error ? (
            <View style={styles.padded}>
              <StatusPanel
                message="Couldn't load the thread."
                onRetry={() => void feedQuery.refresh()}
              />
            </View>
          ) : feedQuery.isLoading && feed.length === 0 ? (
            <Text style={styles.feedEmpty}>Loading the thread…</Text>
          ) : feed.length === 0 ? (
            <Text style={styles.feedEmpty}>
              Check-ins show up here in a thread, newest first.
            </Text>
          ) : (
            <CheckInDayFeed
              days={feed}
              today={today}
              myName={profile.display_name?.trim() || 'You'}
              partnerName={partner ? partnerName : null}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
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
  date: {
    ...type.body,
    color: colors.muted,
    marginTop: 2,
  },
  scroll: {
    paddingBottom: 28,
  },
  padded: {
    paddingHorizontal: 20,
  },
  feed: {
    marginTop: 8,
  },
  feedEmpty: {
    ...type.body,
    color: colors.muted,
    paddingHorizontal: 20,
    marginTop: 8,
  },
})
