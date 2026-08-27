import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import { GrowthObservations } from '../../../components/GrowthObservations'
import { NextStepCard } from '../../../components/NextStepCard'
import { LoadingScreen, Screen } from '../../../components/ui'
import { useCheckInGrowth, useCheckInIndex } from '../../../hooks/useCheckIn'
import { useCoupleGoal } from '../../../hooks/useCoupleGoal'
import { useWeeklyReview } from '../../../hooks/useWeeklyReview'
import { useAuth } from '../../../lib/auth'
import { localDateString } from '../../../lib/dates'
import {
  buildGrowthObservations,
  observationDaysFromIndex,
} from '../../../lib/growthObservations'
import { Icon } from '../../../lib/icons'
import {
  growthUnlocks,
  pickGrowthNext,
  unlockedGrowthItems,
} from '../../../lib/nextStep'
import { colors, hairlineWidth, type } from '../../../lib/theme'

export default function GrowthScreen() {
  const { profile, isLoading } = useAuth()
  const { activeGoals, isLoading: goalsLoading } = useCoupleGoal()
  const { myCheckIns, revealedDays, isLoading: checkInLoading } =
    useCheckInGrowth()
  const { days, isLoading: indexLoading } = useCheckInIndex()
  const { needsReview, unlocked: weeklyUnlocked } = useWeeklyReview()
  const observations = useMemo(
    () =>
      buildGrowthObservations(
        observationDaysFromIndex(days),
        localDateString(),
      ),
    [days],
  )

  const unlocks = useMemo(
    () =>
      growthUnlocks({
        myCheckIns,
        revealedDays,
        weeklyUnlocked,
      }),
    [myCheckIns, revealedDays, weeklyUnlocked],
  )

  const { next, remaining } = pickGrowthNext({
    unlocks,
    needsReview,
    activeGoalCount: activeGoals.length,
    myCheckIns,
    revealedDays,
  })

  const items = unlockedGrowthItems(unlocks, { revealedDays }).filter(
    (item) => item.id !== next?.id,
  )

  if (isLoading || goalsLoading || checkInLoading || indexLoading) {
    return <LoadingScreen />
  }
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Growth</Text>
      <Text style={styles.subtitle}>What should we look at next?</Text>

      {next ? (
        <NextStepCard
          kicker="Next"
          title={next.title}
          body={next.body}
          actionLabel={`Open ${next.title.toLowerCase()}`}
          onAction={() => router.push(next.href)}
        />
      ) : (
        <NextStepCard
          kicker="Not yet"
          title="Rhythm opens after a few check-ins."
          body={
            remaining > 0
              ? `${remaining} more day${remaining === 1 ? '' : 's'} on Today, then this home fills in.`
              : 'Keep the daily ritual. This page stays quiet until it can help.'
          }
          actionLabel="Go to Today"
          onAction={() => router.push('/(app)/(tabs)')}
        />
      )}

      <GrowthObservations observations={observations} />

      {items.length > 0 ? (
        <View style={styles.list}>
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.body}`}
              onPress={() => router.push(item.href)}
              style={(state) => [
                styles.row,
                index === items.length - 1 && styles.rowLast,
                state.pressed && styles.rowPressed,
                Boolean((state as { focused?: boolean }).focused) &&
                  styles.rowFocus,
              ]}
            >
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowBody}>{item.body}</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      ) : null}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    ...type.heading,
    marginBottom: 4,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginBottom: 20,
  },
  list: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 16,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowFocus: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  copy: {
    flex: 1,
  },
  rowTitle: {
    ...type.body,
    fontWeight: '500',
  },
  rowBody: {
    ...type.label,
    marginTop: 2,
    marginBottom: 0,
  },
})
