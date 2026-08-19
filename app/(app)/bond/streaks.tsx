import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import {
  Card,
  LoadingScreen,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '../../../components/ui'
import {
  computeStreak,
  useCheckInHistory,
  useMonthCheckIns,
  useTodayCheckIn,
} from '../../../hooks/useCheckIn'
import { useAuth } from '../../../lib/auth'
import {
  formatMonthTitle,
  getMonthGrid,
  dateKey,
  localDateString,
} from '../../../lib/dates'
import { SCORE_LABELS, colors, radii, scoreColors } from '../../../lib/theme'

export default function BondStreaksScreen() {
  const { profile, partner, isLoading: authLoading } = useAuth()
  const { days, isLoading, refresh } = useCheckInHistory()
  const { mine: todayMine } = useTodayCheckIn()
  const now = useMemo(() => new Date(), [])
  const year = now.getFullYear()
  const month = now.getMonth()
  const { byDate, isLoading: monthLoading } = useMonthCheckIns(year, month)

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

  if (authLoading || isLoading || monthLoading) return <LoadingScreen />

  const grid = getMonthGrid(year, month)
  const partnerName = partner?.display_name ?? 'your partner'

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <BondSectionHeader
          title="Streaks"
          subtitle="Keep showing up. The streak is its own game."
        />

        <Card style={styles.heroCard}>
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
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Today</Text>
          <Text style={styles.sectionHint}>
            Protect the streak that keeps you both showing up.
          </Text>
          {!todayMine ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(app)/check-in')}
              style={styles.questRow}
            >
              <Text style={styles.questGlyph}>◎</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.questTitle}>Check in today</Text>
                <Text style={styles.questBody}>
                  Protect the streak and share how connected you feel.
                </Text>
              </View>
              <Text style={styles.questCta}>Go</Text>
            </Pressable>
          ) : (
            <View style={[styles.questRow, styles.questDone]}>
              <Text style={styles.questGlyph}>◎</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.questTitle}>Today’s check-in saved</Text>
                <Text style={styles.questBody}>
                  {partner
                    ? `Waiting on ${partnerName} to reveal today.`
                    : 'Come back tomorrow to keep growing.'}
                </Text>
              </View>
              <Text style={styles.questDoneLabel}>Done</Text>
            </View>
          )}

          {!todayMine ? (
            <PrimaryButton
              label="Check in now"
              onPress={() => router.push('/(app)/check-in')}
            />
          ) : null}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>
            {formatMonthTitle(year, month)} rhythm
          </Text>
          <Text style={styles.sectionHint}>
            Your connection colors this month. Fill more cells together.
          </Text>
          <View style={styles.matrix}>
            {grid.map((day, index) => {
              if (day == null) {
                return <View key={`e-${index}`} style={styles.matrixCell} />
              }
              const key = dateKey(year, month, day)
              const score = byDate[key]?.mine?.score
              const synced = byDate[key]?.revealed
              return (
                <View
                  key={key}
                  style={[
                    styles.matrixCell,
                    {
                      backgroundColor:
                        score != null ? scoreColors[score] : colors.bgSoft,
                      borderColor: synced ? colors.accent : colors.hairline,
                    },
                  ]}
                />
              )
            })}
          </View>
          <View style={styles.legendRow}>
            {[1, 2, 3, 4, 5].map((score) => (
              <View key={score} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: scoreColors[score] },
                  ]}
                />
                <Text style={styles.legendText}>{score}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
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
        </Card>

        <SecondaryButton label="Refresh" onPress={() => void refresh()} />
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
  heroCard: { borderColor: colors.accent },
  heroEyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroStreak: {
    color: colors.accent,
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 60,
  },
  heroUnit: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: 14,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  heroStatLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  heroDivider: { width: 1, height: 28, backgroundColor: colors.hairline },
  sectionTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.bgSoft,
  },
  questDone: { borderColor: colors.accentSoft },
  questGlyph: {
    fontSize: 22,
    color: colors.accent,
    width: 28,
    textAlign: 'center',
  },
  questTitle: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  questBody: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  questCta: { color: colors.accent, fontWeight: '800', fontSize: 13 },
  questDoneLabel: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  matrix: { flexDirection: 'row', flexWrap: 'wrap' },
  matrixCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  distList: { gap: 8 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distLabel: {
    width: 96,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  distTrack: {
    flex: 1,
    height: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  distFill: { height: '100%' },
  distCount: {
    width: 28,
    textAlign: 'right',
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
})
