import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, useFocusEffect } from 'expo-router'

import { NextStepCard } from '../../../components/NextStepCard'
import { PlusOfferCard } from '../../../components/PlusOfferCard'
import { RevealMoment, SharedActionCard, WaitingMoment } from '../../../components/CheckInMoment'
import { CheckInSyncBanner } from '../../../components/CheckInSyncBanner'
import { LoadingScreen, Screen, StatusPanel, TextLink } from '../../../components/ui'
import { useTodayCheckIn, useCheckInGrowth, useCheckInIndex } from '../../../hooks/useCheckIn'
import { useBondPlus } from '../../../hooks/useBondPlus'
import { useDailyAction } from '../../../hooks/useDailyAction'
import { useNotificationPreferences } from '../../../hooks/useNotificationPreferences'
import { useAuth } from '../../../lib/auth'
import { hasSentNudge, markNudgeSent } from '../../../lib/checkInDraft'
import { promptForDate } from '../../../lib/dailyPrompts'
import { formatDisplayDate, localDateString } from '../../../lib/dates'
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
    sendNudge,
    syncing,
  } = useTodayCheckIn()
  const { myCheckIns, lastDate } = useCheckInGrowth()
  const { days: indexDays } = useCheckInIndex()
  const plus = useBondPlus()
  const { accepted } = useDailyAction()
  const { remindInOneHour } = useNotificationPreferences()
  const { showToast } = useToast()
  const [nudged, setNudged] = useState(false)
  const [nudging, setNudging] = useState(false)
  const [snoozing, setSnoozing] = useState(false)
  const today = localDateString()
  const queued = useQueuedCheckIn(user?.id, today)
  const online = useOnline()

  const insight = useMemo(
    () => firstInsight(observationDaysFromIndex(indexDays)),
    [indexDays],
  )

  useFocusEffect(
    useCallback(() => {
      void refresh()
    }, [refresh]),
  )

  useEffect(() => {
    if (!user?.id || !mine) return
    void hasSentNudge(user.id, today).then(setNudged)
  }, [mine, today, user?.id])

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

  const onNudge = async () => {
    if (!user?.id || nudged || nudging) return
    setNudging(true)
    const result = await sendNudge()
    setNudging(false)
    if (result.error) return
    await markNudgeSent(user.id, today)
    setNudged(true)
  }

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
          <RefreshControl refreshing={false} onRefresh={() => void refresh()} />
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
              kicker="What now"
              title={prompt.text}
              body={
                queued
                  ? 'Saved on this device, waiting to sync. It is not in the relationship until Bond confirms it.'
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

        {phase === 'waiting' && mine && partner ? (
          <WaitingMoment
            mine={mine}
            partnerName={partnerName}
            userId={user?.id ?? ''}
            nudged={nudged}
            nudging={nudging}
            onNudge={() => void onNudge()}
            onRefresh={() => void refresh()}
            onEdit={() => router.push('/(app)/check-in?edit=1')}
          />
        ) : null}

        {phase === 'waiting' && mine && !partner ? (
          <NextStepCard
            kicker="Saved"
            title="Your check-in is safe."
            body="Invite your person from Us when you are ready. There is no rush."
          />
        ) : null}

        {phase === 'reveal' && mine && partnerCheckIn && user?.id ? (
          <RevealMoment
            mine={mine}
            partner={partnerCheckIn}
            partnerName={partnerName}
          />
        ) : null}

        {plus.offerEligible && insight ? (
          <PlusOfferCard
            insight={insight}
            onNotNow={() => void plus.snoozeOffer()}
          />
        ) : null}
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
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
})
