import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import {
  LoadingScreen,
  PrimaryButton,
  Screen,
  StatusPanel,
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
import { Icon } from '../../../lib/icons'
import { SCORE_LABELS, colors, hairlineWidth, radii, scoreColors, type } from '../../../lib/theme'

export default function BondStreaksScreen() {
  const { profile, partner, isLoading: authLoading } = useAuth()
  const { days, isLoading, error, refresh } = useCheckInHistory()
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

        <View style={styles.section}>
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
              <Icon name="edit-3" size={18} color={colors.ink} />
              <View style={{ flex: 1 }}>
                <Text style={styles.questTitle}>Check in today</Text>
                <Text style={styles.questBody}>
                  Protect the streak and share how connected you feel.
                </Text>
              </View>
              <Text style={styles.questCta}>Go</Text>
            </Pressable>
          ) : (
            <View style={styles.questRow}>
              <Icon name="check" size={18} color={colors.ink} />
              <View style={{ flex: 1 }}>
                <Text style={styles.questTitle}>Today's check-in saved</Text>
                <Text style={styles.questBody}>
                  {partner
                    ? `Waiting on ${partnerName} to reveal today.`
                    : 'Come back tomorrow to keep growing.'}
                </Text>
              </View>
            </View>
          )}

          {!todayMine ? (
            <PrimaryButton
              label="Check in now"
              onPress={() => router.push('/(app)/check-in')}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {formatMonthTitle(year, month)} rhythm
          </Text>
          <Text style={styles.sectionHint}>
            Your connection this month. Fill more cells together.
          </Text>
          <View style={styles.matrix}>
            {grid.map((day, index) => {
              if (day == null) {
                return <View key={`e-${index}`} style={styles.matrixSlot} />
              }
              const key = dateKey(year, month, day)
              const score = byDate[key]?.mine?.score
              const synced = byDate[key]?.revealed
              return (
                <View key={key} style={styles.matrixSlot}>
                  <View
                    style={[
                      styles.matrixDot,
                      {
                        backgroundColor:
                          score != null ? scoreColors[score] : colors.bgSoft,
                        borderWidth: synced ? 1.5 : 0,
                        borderColor: colors.accent,
                      },
                    ]}
                  />
                </View>
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
