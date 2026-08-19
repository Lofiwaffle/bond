import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Redirect } from 'expo-router'

import {
  BadgeRow,
  Card,
  LoadingScreen,
  Screen,
  SecondaryButton,
  StreakChip,
  Subtitle,
  Title,
} from '../../../components/ui'
import {
  computeStreak,
  useCheckInHistory,
  useMonthCheckIns,
} from '../../../hooks/useCheckIn'
import { useAuth } from '../../../lib/auth'
import {
  formatMonthTitle,
  getMonthGrid,
  dateKey,
  localDateString,
} from '../../../lib/dates'
import { SCORE_LABELS, colors, radii, scoreColors } from '../../../lib/theme'

export default function StatsScreen() {
  const { profile, partner, isLoading: authLoading } = useAuth()
  const { days, isLoading, refresh } = useCheckInHistory()
  const now = useMemo(() => new Date(), [])
  const year = now.getFullYear()
  const month = now.getMonth()
  const { byDate, isLoading: monthLoading } = useMonthCheckIns(year, month)

  const stats = useMemo(() => {
    const today = localDateString()
    const myDates = days.filter((d) => d.mine).map((d) => d.date)
    const streak = computeStreak(myDates, today)
    const hasMutualReveal = days.some((d) => d.revealed)

    const yearMine = [0, 0, 0, 0, 0]
    const yearPartner = [0, 0, 0, 0, 0]
    for (const day of days) {
      if (!day.date.startsWith(String(year))) continue
      if (day.mine?.score) yearMine[day.mine.score - 1] += 1
      if (day.revealed && day.partner?.score) {
        yearPartner[day.partner.score - 1] += 1
      }
    }

    const mineTotal = yearMine.reduce((a, b) => a + b, 0)
    const partnerTotal = yearPartner.reduce((a, b) => a + b, 0)

    return {
      streak,
      hasMutualReveal,
      yearMine,
      yearPartner,
      mineTotal,
      partnerTotal,
    }
  }, [days, year])

  if (authLoading || isLoading || monthLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/pair" />

  const grid = getMonthGrid(year, month)

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Title>Bond</Title>
        <StreakChip streak={stats.streak} />
      </View>
      <Subtitle>
        Your connection at a glance
        {partner ? ` with ${partner.display_name}` : ''}.
      </Subtitle>

      <Card>
        <Text style={styles.sectionTitle}>Badges</Text>
        <BadgeRow
          progress={{
            streak: stats.streak,
            hasMutualReveal: stats.hasMutualReveal,
          }}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>
          {formatMonthTitle(year, month)} matrix
        </Text>
        <View style={styles.matrix}>
          {grid.map((day, index) => {
            if (day == null) {
              return <View key={`e-${index}`} style={styles.matrixCell} />
            }
            const key = dateKey(year, month, day)
            const score = byDate[key]?.mine?.score
            return (
              <View
                key={key}
                style={[
                  styles.matrixCell,
                  {
                    backgroundColor:
                      score != null ? scoreColors[score] : colors.bgSoft,
                    borderColor: colors.hairline,
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
                style={[styles.legendSwatch, { backgroundColor: scoreColors[score] }]}
              />
              <Text style={styles.legendText}>{score}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>{year} distribution</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 12,
  },
  matrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
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
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  distList: {
    gap: 8,
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
  distFill: {
    height: '100%',
  },
  distCount: {
    width: 28,
    textAlign: 'right',
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
})
