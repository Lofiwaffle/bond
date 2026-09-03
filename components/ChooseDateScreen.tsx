import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import { DatePlanForm } from './DatePlanForm'
import { ErrorText, LoadingScreen, Screen, TextLink } from './ui'
import { useCouplePlays } from '../hooks/useCouplePlay'
import { useAuth } from '../lib/auth'
import {
  datePlanCalendarEvent,
  datePlanLabel,
  normalizeDatePlan,
} from '../lib/datePlan'
import { scheduleCalendarEvent } from '../lib/deviceCalendar'
import { Icon } from '../lib/icons'
import { useToast } from '../lib/toast'
import { colors, type } from '../lib/theme'
import type { Json } from '../types/database'

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

export function ChooseDateScreen() {
  const { profile, partner, isLoading: authLoading } = useAuth()
  const plays = useCouplePlays()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (authLoading || plays.isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  const partnerName = partner?.display_name?.trim() || 'your person'
  const openPlay = plays.openOfKind('choose_date')
  const myPlan = openPlay ? normalizeDatePlan(asRecord(openPlay.mine?.payload)) : null
  const theirPlan = openPlay ? normalizeDatePlan(asRecord(openPlay.partner?.payload)) : null
  const waiting = Boolean(openPlay?.mine && !openPlay.partner)

  const onSubmit = async (payload: Json) => {
    if (busy) return
    const plan = normalizeDatePlan(payload)
    if (!plan) {
      setError('Choose what, when, and where first.')
      return
    }
    setBusy(true)
    setError(null)
    let current = openPlay && !openPlay.mine ? openPlay : null
    if (!current) {
      const started = await plays.startOrOpen('choose_date')
      if (started.error || !started.data) {
        setBusy(false)
        setError(started.error ?? 'Could not start this date.')
        return
      }
      current = started.data
      if (current.mine) {
        setBusy(false)
        setError('This date is already saved. Wait for them, or come back after it opens.')
        return
      }
    }
    const result = await plays.answer(current.id, payload)
    if (result.error) {
      setBusy(false)
      setError(result.error)
      return
    }
    const calendar = await scheduleCalendarEvent(datePlanCalendarEvent(plan))
    setBusy(false)
    if (calendar.error) {
      showToast(calendar.error)
      return
    }
    showToast(
      calendar.placed === 'device'
        ? 'Saved. Added to your calendar.'
        : 'Saved. Calendar opened for that day.',
    )
  }

  return (
    <Screen keyboard>
      <TextLink label="Back" onPress={() => router.back()} />
      <View style={styles.hero}>
        <View style={styles.glyph}>
          <Icon name="map-pin" size={22} color={colors.accentFill} />
        </View>
        <Text style={styles.title}>Choose our date</Text>
      </View>

      {waiting ? (
        <View>
          <Text style={styles.body}>
            Your plan is saved. {partnerName} will not see it until they finish too.
          </Text>
          {myPlan ? (
            <View style={styles.block}>
              <Text style={styles.kicker}>Your plan</Text>
              <Text style={styles.body}>{myPlan.what}</Text>
              <Text style={styles.body}>{datePlanLabel(myPlan.when, myPlan.whenTime)}</Text>
              <Text style={styles.body}>{myPlan.where}</Text>
              {myPlan.why ? <Text style={styles.body}>{myPlan.why}</Text> : null}
            </View>
          ) : null}
          <ErrorText message={error} />
        </View>
      ) : theirPlan && myPlan ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>You</Text>
          <Text style={styles.body}>
            {myPlan.what} · {datePlanLabel(myPlan.when, myPlan.whenTime)} · {myPlan.where}
          </Text>
          <Text style={styles.kicker}>{partnerName}</Text>
          <Text style={styles.body}>
            {theirPlan.what} · {datePlanLabel(theirPlan.when, theirPlan.whenTime)} ·{' '}
            {theirPlan.where}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <DatePlanForm busy={busy} error={error} onSubmit={onSubmit} />
        </ScrollView>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  glyph: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.heading,
    flex: 1,
    marginBottom: 0,
  },
  kicker: {
    ...type.label,
    color: colors.accentFill,
    marginTop: 12,
    marginBottom: 6,
  },
  body: {
    ...type.body,
    marginBottom: 12,
  },
  block: {
    marginBottom: 12,
  },
})
