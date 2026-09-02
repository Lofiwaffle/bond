import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, type Href } from 'expo-router'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import { NextStepCard } from '../../../components/NextStepCard'
import { LoadingScreen, Screen } from '../../../components/ui'
import { useCheckInGrowth } from '../../../hooks/useCheckIn'
import { useBondPlus } from '../../../hooks/useBondPlus'
import { useCoupleGoal } from '../../../hooks/useCoupleGoal'
import { useWeeklyReview } from '../../../hooks/useWeeklyReview'
import { useAuth } from '../../../lib/auth'
import { Icon } from '../../../lib/icons'
import {
  growthUnlocks,
  pickGrowthNext,
  unlockedGrowthItems,
} from '../../../lib/nextStep'
import { colors, hairlineWidth, type } from '../../../lib/theme'

export default function GrowthHubScreen() {
  const { profile, isLoading } = useAuth()
  const { activeGoals, isLoading: goalsLoading } = useCoupleGoal()
  const { myCheckIns, revealedDays, isLoading: checkInLoading } =
    useCheckInGrowth()
  const plus = useBondPlus()
  const { needsReview, unlocked: weeklyUnlocked } = useWeeklyReview()

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

  const items = unlockedGrowthItems(unlocks, { revealedDays }).filter(
    (item) => item.id !== next?.id,
  )

  if (isLoading || goalsLoading || checkInLoading || plus.isLoading) {
    return <LoadingScreen />
  }
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <BondSectionHeader
          title="More in Growth"
          subtitle="Goals, rhythm, prompts, and milestones — when you want them."
        />

        {next ? (
          <NextStepCard
            kicker="Next"
            title={next.title}
            body={next.body}
            actionLabel={`Open ${next.title.toLowerCase()}`}
            onAction={() => router.push(next.href as Href)}
          />
        ) : null}

        <View style={styles.list}>
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.body}`}
              onPress={() => router.push(item.href as Href)}
              style={(state) => [
                styles.row,
                index === items.length - 1 && plus.active && styles.rowLast,
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
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: {
    marginTop: 4,
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
