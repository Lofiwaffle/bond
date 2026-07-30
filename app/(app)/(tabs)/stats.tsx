import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Redirect } from 'expo-router'

import {
  Card,
  LoadingScreen,
  ScoreEmoji,
  Screen,
  SecondaryButton,
  Subtitle,
  Title,
} from '../../../components/ui'
import {
  computeStreak,
  useCheckInHistory,
} from '../../../hooks/useCheckIn'
import { useAuth } from '../../../lib/auth'
import { addDays, localDateString } from '../../../lib/dates'
import { colors, scoreColors } from '../../../lib/theme'

export default function StatsScreen() {
  const { profile, partner, isLoading: authLoading } = useAuth()
  const { days, isLoading, refresh } = useCheckInHistory()

  const stats = useMemo(() => {
    const today = localDateString()
    const myDates = days.filter((d) => d.mine).map((d) => d.date)
    const streak = computeStreak(myDates, today)

    const last7Keys = Array.from({ length: 7 }, (_, i) => addDays(today, -6 + i))
    const last7 = last7Keys.map((date) => {
      const day = days.find((d) => d.date === date)
      return { date, score: day?.mine?.score ?? null }
    })

    const myScores = last7.filter((d) => d.score != null).map((d) => d.score!)
    const myAvg =
      myScores.length > 0
        ? myScores.reduce((a, b) => a + b, 0) / myScores.length
        : null

    const partnerScores = days
      .filter((d) => d.revealed && d.partner)
      .slice(0, 7)
      .map((d) => d.partner!.score)
    const partnerAvg =
      partnerScores.length > 0
        ? partnerScores.reduce((a, b) => a + b, 0) / partnerScores.length
        : null

    return { streak, last7, myAvg, partnerAvg }
  }, [days])

  if (authLoading || isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/pair" />

  return (
    <Screen>
      <Title>Stats</Title>
      <Subtitle>Your connection streak and recent vibes.</Subtitle>

      <View style={styles.row}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.streak}</Text>
          <Text style={styles.statLabel}>Day streak</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>
            {stats.myAvg != null ? stats.myAvg.toFixed(1) : '—'}
          </Text>
          <Text style={styles.statLabel}>7-day avg</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Last 7 days</Text>
        <View style={styles.weekRow}>
          {stats.last7.map((day) => (
            <View key={day.date} style={styles.weekCell}>
              <Text style={styles.weekDow}>
                {day.date.slice(8)}
              </Text>
              {day.score != null ? (
                <View
                  style={[
                    styles.weekFace,
                    { backgroundColor: scoreColors[day.score] },
                  ]}
                >
                  <ScoreEmoji score={day.score} size={22} />
                </View>
              ) : (
                <View style={styles.weekEmpty} />
              )}
            </View>
          ))}
        </View>
      </Card>

      {partner ? (
        <Card>
          <Text style={styles.sectionTitle}>
            {partner.display_name} (revealed days)
          </Text>
          <Text style={styles.partnerAvg}>
            {stats.partnerAvg != null
              ? `Avg ${stats.partnerAvg.toFixed(1)} from recent shared days`
              : 'No revealed days yet — both need to check in.'}
          </Text>
        </Card>
      ) : null}

      <SecondaryButton label="Refresh" onPress={() => void refresh()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 22,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.accentPressed,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 12,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekCell: {
    alignItems: 'center',
    gap: 6,
  },
  weekDow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
  },
  weekFace: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekEmpty: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  partnerAvg: {
    color: colors.muted,
    lineHeight: 20,
  },
})
