import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, useFocusEffect } from 'expo-router'

import { NextStepCard } from '../../../components/NextStepCard'
import { RevealMoment, WaitingMoment } from '../../../components/CheckInMoment'
import { LoadingScreen, Screen, StatusPanel } from '../../../components/ui'
import { useTodayCheckIn } from '../../../hooks/useCheckIn'
import { useAuth } from '../../../lib/auth'
import { hasSentNudge, markNudgeSent } from '../../../lib/checkInDraft'
import { promptForDate } from '../../../lib/dailyPrompts'
import { formatDisplayDate, localDateString } from '../../../lib/dates'
import { todayPhase } from '../../../lib/nextStep'
import { colors, type } from '../../../lib/theme'

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
  } = useTodayCheckIn()
  const [nudged, setNudged] = useState(false)
  const [nudging, setNudging] = useState(false)
  const today = localDateString()

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

  const onNudge = async () => {
    if (!user?.id || nudged || nudging) return
    setNudging(true)
    const result = await sendNudge()
    setNudging(false)
    if (result.error) return
    await markNudgeSent(user.id, today)
    setNudged(true)
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
        {error ? (
          <StatusPanel
            message="Couldn't load today."
            onRetry={() => void refresh()}
          />
        ) : null}

        {phase === 'compose' ? (
          <NextStepCard
            kicker="What now"
            title={prompt.text}
            body="Two minutes. Private until you both check in."
            actionLabel="Check in"
            onAction={() => router.push('/(app)/check-in')}
          />
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
            userId={user.id}
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
