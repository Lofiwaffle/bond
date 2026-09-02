import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, type Href } from 'expo-router'

import { NextStepCard } from '../../../components/NextStepCard'
import { LoadingScreen, Screen } from '../../../components/ui'
import { useCheckInGrowth, useCheckInIndex } from '../../../hooks/useCheckIn'
import { useBondPlus } from '../../../hooks/useBondPlus'
import { useWeeklyReview } from '../../../hooks/useWeeklyReview'
import { useAuth } from '../../../lib/auth'
import { localDateString } from '../../../lib/dates'
import { firstInsight } from '../../../lib/firstInsight'
import {
  buildGrowthObservations,
  observationDaysFromIndex,
} from '../../../lib/growthObservations'
import { Icon } from '../../../lib/icons'
import { daysUntilFirstLook, pickWeeklyInsight } from '../../../lib/nextStep'
import { colors, hairlineWidth, type } from '../../../lib/theme'

export default function GrowthScreen() {
  const { profile, isLoading } = useAuth()
  const { myCheckIns, isLoading: checkInLoading } = useCheckInGrowth()
  const { days, isLoading: indexLoading } = useCheckInIndex()
  const plus = useBondPlus()
  const { needsReview, isLoading: weeklyLoading } = useWeeklyReview()
  const observationDays = useMemo(() => observationDaysFromIndex(days), [days])
  const observations = useMemo(
    () => buildGrowthObservations(observationDays, localDateString()),
    [observationDays],
  )
  const insight = useMemo(() => firstInsight(observationDays), [observationDays])
  const weekly = pickWeeklyInsight({
    needsReview,
    insightTitle: plus.active
      ? observations[0]
        ? 'What we noticed'
        : insight?.title ?? null
      : insight?.title ?? null,
    insightBody: plus.active
      ? observations[0]?.body ?? insight?.body ?? null
      : insight?.body ?? null,
    remaining: daysUntilFirstLook(myCheckIns),
  })

  if (isLoading || checkInLoading || indexLoading || plus.isLoading || weeklyLoading) {
    return <LoadingScreen />
  }
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Growth</Text>
        <Text style={styles.subtitle}>One look this week.</Text>

        <NextStepCard
          kicker={weekly.kicker}
          title={weekly.title}
          body={weekly.body}
          actionLabel={weekly.actionLabel}
          onAction={
            weekly.href
              ? () => router.push(weekly.href as Href)
              : undefined
          }
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More in Growth. Goals, rhythm, prompts, and milestones."
          onPress={() => router.push('/(app)/bond/hub' as Href)}
          style={(state) => [
            styles.row,
            state.pressed && styles.rowPressed,
            Boolean((state as { focused?: boolean }).focused) && styles.rowFocus,
          ]}
        >
          <View style={styles.copy}>
            <Text style={styles.rowTitle}>More in Growth</Text>
            <Text style={styles.rowBody}>
              Goals, rhythm, prompts, and milestones — when you want them.
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color={colors.muted} />
        </Pressable>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 16,
    marginTop: 8,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
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
