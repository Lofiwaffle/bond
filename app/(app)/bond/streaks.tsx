import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import {
  LoadingScreen,
  Screen,
  StatusPanel,
} from '../../../components/ui'
import {
  computeStreak,
  useCheckInHistory,
} from '../../../hooks/useCheckIn'
import { useAuth } from '../../../lib/auth'
import { localDateString } from '../../../lib/dates'
import { SCORE_LABELS, colors, hairlineWidth, radii, scoreColors, type } from '../../../lib/theme'

export default function BondStreaksScreen() {
  const { partner, isLoading: authLoading } = useAuth()
  const { days, isLoading, error, refresh } = useCheckInHistory()
  const now = useMemo(() => new Date(), [])
  const year = now.getFullYear()

  const stats = useMemo(() => {
    const today = localDateString()
    const myDates = days.filter((d) => d.mine).map((d) => d.date)
    const streak = computeStreak(myDates, today)
    const togetherCount =
      days.filter((d) => d.mine).length +
      days.filter((d) => d.revealed && d.partner).length

    const yearMine = [0, 0, 0, 0, 0]
    const yearPartner = [0, 0, 0, 0, 0]
    for (const day of days) {
      if (!day.date.startsWith(String(year))) continue
      if (day.mine?.score) yearMine[day.mine.score - 1] += 1
      if (day.revealed && day.partner?.score) {
        yearPartner[day.partner.score - 1] += 1
      }
    }

    return {
      streak,
      togetherCount,
      yearMine,
      yearPartner,
      mineTotal: yearMine.reduce((a, b) => a + b, 0),
      partnerTotal: yearPartner.reduce((a, b) => a + b, 0),
    }
  }, [days, year])

  if (authLoading || isLoading) return <LoadingScreen />

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <BondSectionHeader
          title="Patterns"
          subtitle="How you have been showing up, without a scoreboard."
        />
        {error ? (
          <StatusPanel
            message="Couldn't load your streak."
            onRetry={() => void refresh()}
          />
        ) : null}

        <View style={styles.section}>
          <Text style={styles.heroEyebrow}>Together streak</Text>
          <Text style={styles.heroStreak}>{stats.streak}</Text>
          <Text style={styles.heroUnit}>days showing up</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.togetherCount}</Text>
              <Text style={styles.heroStatLabel}>check-ins</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stats.mineTotal}</Text>
              <Text style={styles.heroStatLabel}>{year} yours</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionLast}>
          <Text style={styles.sectionTitle}>{year} connection mix</Text>
          <Text style={styles.meta}>You · {stats.mineTotal} check-ins</Text>
          <DistributionBars counts={stats.yearMine} total={stats.mineTotal} />
          {partner ? (
            <>
              <Text style={[styles.meta, { marginTop: 16 }]}>
                {partner.display_name} · {stats.partnerTotal} revealed
              </Text>
              <DistributionBars
                counts={stats.yearPartner}
                total={stats.partnerTotal}
              />
            </>
          ) : null}
        </View>
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
  sectionLast: {
    paddingVertical: 16,
  },
  heroEyebrow: {
    ...type.label,
    marginBottom: 4,
  },
  heroStreak: {
    ...type.heading,
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '500',
  },
  heroUnit: {
    ...type.body,
    color: colors.muted,
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { ...type.heading },
  heroStatLabel: {
    ...type.label,
    marginTop: 2,
    marginBottom: 0,
  },
  heroDivider: { width: 0.5, height: 28, backgroundColor: colors.hairline },
  sectionTitle: {
    ...type.heading,
    marginBottom: 4,
  },
  sectionHint: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  questTitle: { ...type.body, fontWeight: '500' },
  questBody: {
    ...type.label,
    marginTop: 2,
    marginBottom: 0,
  },
  questCta: { ...type.label, color: colors.accent, marginBottom: 0 },
  matrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  matrixSlot: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  matrixDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...type.label, marginBottom: 0 },
  meta: {
    ...type.label,
    marginBottom: 8,
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
