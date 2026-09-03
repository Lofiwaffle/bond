import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, type Href } from 'expo-router'

import { GrowthObservations } from '../../../components/GrowthObservations'
import { NextStepCard } from '../../../components/NextStepCard'
import { TogetherLauncher } from '../../../components/TogetherLauncher'
import { LoadingScreen, Screen } from '../../../components/ui'
import { useCheckInGrowth, useCheckInIndex } from '../../../hooks/useCheckIn'
import { useBondPlus } from '../../../hooks/useBondPlus'
import { useCoupleGoal } from '../../../hooks/useCoupleGoal'
import { useWeeklyReview } from '../../../hooks/useWeeklyReview'
import { useAuth } from '../../../lib/auth'
import { localDateString } from '../../../lib/dates'
import { firstInsight } from '../../../lib/firstInsight'
import {
  buildGrowthObservations,
  observationDaysFromIndex,
} from '../../../lib/growthObservations'
import { Icon, type IconName } from '../../../lib/icons'
import {
  bondHubItems,
  growthUnlocks,
  pickGrowthNext,
} from '../../../lib/nextStep'
import { colors, elevation, hairlineWidth, radii, type } from '../../../lib/theme'

const HUB_ICONS: Record<string, IconName> = {
  achievements: 'award',
  prompts: 'message-circle',
  goals: 'target',
  patterns: 'activity',
  weekly: 'calendar',
  reviews: 'book-open',
}

export default function GrowthScreen() {
  const { profile, isLoading } = useAuth()
  const { activeGoals, isLoading: goalsLoading } = useCoupleGoal()
  const { myCheckIns, revealedDays, isLoading: checkInLoading } =
    useCheckInGrowth()
  const { days, isLoading: indexLoading } = useCheckInIndex()
  const plus = useBondPlus()
  const { needsReview, unlocked: weeklyUnlocked } = useWeeklyReview()
  const observationDays = useMemo(() => observationDaysFromIndex(days), [days])
  const observations = useMemo(
    () => buildGrowthObservations(observationDays, localDateString()),
    [observationDays],
  )
  const insight = useMemo(() => firstInsight(observationDays), [observationDays])

  const unlocks = useMemo(
    () =>
      growthUnlocks({
        myCheckIns,
        revealedDays,
        weeklyUnlocked,
      }),
    [myCheckIns, revealedDays, weeklyUnlocked],
  )

  const { next } = pickGrowthNext({
    unlocks,
    needsReview,
    activeGoalCount: activeGoals.length,
    myCheckIns,
    revealedDays,
  })

  const items = bondHubItems().filter((item) => item.id !== next?.id)

  if (isLoading || goalsLoading || checkInLoading || indexLoading || plus.isLoading) {
    return <LoadingScreen />
  }
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Growth</Text>
      <Text style={styles.subtitle}>Small ways to grow, together.</Text>

      <TogetherLauncher inset={false} />

      {next ? (
        <NextStepCard
          kicker="Next"
          title={next.title}
          body={next.body}
          actionLabel={`Open ${next.title.toLowerCase()}`}
          onAction={() => router.push(next.href as Href)}
        />
      ) : null}

      {plus.active ? (
        <GrowthObservations observations={observations} />
      ) : insight ? (
        <GrowthObservations
          observations={[{ id: 'similar', body: insight.body }]}
        />
      ) : (
        <GrowthObservations
          observations={[]}
          lockedHint="After three days you both open, a first look appears here. Longer trends are Bond Plus."
        />
      )}

      {items.length > 0 ? (
        <View style={styles.list}>
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.body}`}
              onPress={() => router.push(item.href as Href)}
              style={(state) => [
                styles.row,
                index === items.length - 1 && !plus.active && styles.rowLast,
                state.pressed && styles.rowPressed,
                Boolean((state as { focused?: boolean }).focused) &&
                  styles.rowFocus,
              ]}
            >
              <View style={styles.glyph}>
                <Icon
                  name={HUB_ICONS[item.id] ?? 'chevron-right'}
                  size={18}
                  color={colors.accentFill}
                />
              </View>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowBody}>{item.body}</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </Pressable>
          ))}
          {plus.active ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bond Plus. Deeper growth for the two of you."
              onPress={() => router.push('/(app)/plus' as Href)}
              style={(state) => [
                styles.row,
                styles.rowLast,
                state.pressed && styles.rowPressed,
                Boolean((state as { focused?: boolean }).focused) &&
                  styles.rowFocus,
              ]}
            >
              <View style={styles.glyph}>
                <Icon name="star" size={18} color={colors.accentFill} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>Bond Plus</Text>
                <Text style={styles.rowBody}>
                  History, State of Us, and trends — without paying to see an
                  answer already shared.
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.muted} />
            </Pressable>
          )}
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
    marginBottom: 16,
  },
  list: {
    marginTop: 8,
    marginBottom: 28,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    ...elevation.card,
  },
  rowLast: {},
  rowPressed: {
    backgroundColor: colors.accentSoft,
  },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowFocus: {
    borderRadius: radii.lg,
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
