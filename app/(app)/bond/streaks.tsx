import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import { GrowthObservations } from '../../../components/GrowthObservations'
import {
  LoadingScreen,
  Screen,
  StatusPanel,
} from '../../../components/ui'
import { useCheckInIndex } from '../../../hooks/useCheckIn'
import { useAuth } from '../../../lib/auth'
import { localDateString } from '../../../lib/dates'
import {
  OBSERVATION_MIN_REVEALED,
  buildGrowthObservations,
  observationDaysFromIndex,
} from '../../../lib/growthObservations'
import { describeRhythm, welcomeBackCopy } from '../../../lib/rhythm'
import { SCORE_LABELS, colors, hairlineWidth, radii, scoreColors, type } from '../../../lib/theme'

export default function BondRhythmScreen() {
  const { isLoading: authLoading } = useAuth()
  const { days, isLoading, error, refresh } = useCheckInIndex()
  const now = useMemo(() => new Date(), [])
  const year = now.getFullYear()

  const stats = useMemo(() => {
    const today = localDateString()
    const myDates = days.filter((d) => d.mineScore != null).map((d) => d.date)
    const revealedDates = days.filter((d) => d.revealed).map((d) => d.date)
    const rhythm = describeRhythm(myDates, revealedDates, today)
    const yearMine = [0, 0, 0, 0, 0]
    for (const day of days) {
      if (!day.date.startsWith(String(year))) continue
      if (day.mineScore) yearMine[day.mineScore - 1] += 1
    }
    const observations = buildGrowthObservations(
      observationDaysFromIndex(days),
      today,
    )
    return {
      rhythm,
      yearMine,
      mineTotal: yearMine.reduce((a, n) => a + n, 0),
      revealedCount: revealedDates.length,
      observations,
    }
  }, [days, year])

  if (authLoading || isLoading) return <LoadingScreen />

  const welcome = welcomeBackCopy(stats.rhythm)

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <BondSectionHeader
          title="Rhythm"
          subtitle="Days you showed up. Missing one does not erase the rest."
        />
        {error ? (
          <StatusPanel
            message="Couldn't load your rhythm."
            onRetry={() => void refresh()}
          />
        ) : null}

        <View style={styles.section}>
          <Text style={styles.heroEyebrow}>Days connected</Text>
          <Text style={styles.heroStreak}>{stats.rhythm.daysConnected}</Text>
          <Text style={styles.heroUnit}>check-ins that still count</Text>
          {welcome ? <Text style={styles.welcome}>{welcome}</Text> : null}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.rhythm.daysOpen}</Text>
              <Text style={styles.heroStatLabel}>days opened together</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {stats.rhythm.gapDays <= 1 ? stats.rhythm.stretch : '—'}
              </Text>
              <Text style={styles.heroStatLabel}>
                {stats.rhythm.gapDays <= 1
                  ? 'recent stretch, with room to miss a day'
                  : 'stretch pauses; days stay'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How your days felt</Text>
          <Text style={styles.meta}>
            Your labels only. Not a ranking, and not a health score.
          </Text>
          <DistributionBars counts={stats.yearMine} total={stats.mineTotal} />
        </View>

        <GrowthObservations
          observations={stats.observations}
          lockedHint={
            stats.revealedCount < OBSERVATION_MIN_REVEALED
              ? 'Observations about opened days appear after 14 days you both completed.'
              : undefined
          }
        />
      </ScrollView>
    </Screen>
  )
}

function DistributionBars({
  counts,
  total,
}: {
  counts: number[]
  total: number
}) {
  return (
    <View style={styles.distList}>
      {counts.map((count, index) => {
        const score = index + 1
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <View key={score} style={styles.distRow}>
            <Text style={styles.distLabel}>{SCORE_LABELS[score]}</Text>
            <View style={styles.distTrack}>
              <View
                style={[
                  styles.distFill,
                  {
                    width: `${pct}%`,
                    backgroundColor: scoreColors[score],
                  },
                ]}
              />
            </View>
            <Text style={styles.distCount}>{count}</Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 8 },
  section: {
    paddingVertical: 16,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  heroEyebrow: {
    ...type.label,
    marginBottom: 4,
  },
  heroStreak: {
    ...type.heading,
    fontSize: 48,
    lineHeight: 56,
  },
  heroUnit: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  welcome: {
    ...type.body,
    marginBottom: 12,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  heroStat: {
    flex: 1,
  },
  heroStatValue: {
    ...type.heading,
  },
  heroStatLabel: {
    ...type.label,
    marginTop: 4,
    marginBottom: 0,
  },
  heroDivider: {
    width: hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.hairline,
    marginHorizontal: 12,
  },
  sectionTitle: {
    ...type.heading,
    marginBottom: 4,
  },
  meta: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  distList: { gap: 8 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distLabel: {
    width: 108,
    ...type.label,
    marginBottom: 0,
  },
  distTrack: {
    flex: 1,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.bgSoft,
    overflow: 'hidden',
  },
  distFill: { height: '100%', backgroundColor: colors.ink },
  distCount: {
    width: 28,
    textAlign: 'right',
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
})
