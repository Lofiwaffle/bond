import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import {
  ErrorText,
  LoadingScreen,
  Screen,
  SecondaryButton,
  Subtitle,
  Title,
} from '../../components/ui'
import { useCheckInHistory } from '../../hooks/useCheckIn'
import { useAuth } from '../../lib/auth'
import { SCORE_LABELS, formatDisplayDate } from '../../lib/dates'

export default function HistoryScreen() {
  const { profile, partner, user, isLoading: authLoading } = useAuth()
  const { days, isLoading, error, refresh } = useCheckInHistory()

  if (authLoading || isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/pair" />

  return (
    <Screen style={styles.screen}>
      <Title>Check-in history</Title>
      <Subtitle>
        Past days show partner answers only after you both submitted that day.
      </Subtitle>

      <ErrorText message={error} />

      <ScrollView contentContainerStyle={styles.list}>
        {days.length === 0 ? (
          <Text style={styles.empty}>No check-ins yet.</Text>
        ) : (
          days.map((day) => (
            <View key={day.date} style={styles.card}>
              <Text style={styles.date}>{formatDisplayDate(day.date)}</Text>

              <Text style={styles.metaLabel}>You</Text>
              {day.mine ? (
                <>
                  <Text style={styles.metaValue}>
                    {day.mine.score} · {SCORE_LABELS[day.mine.score]}
                  </Text>
                  {day.mine.note ? (
                    <Text style={styles.note}>{day.mine.note}</Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.muted}>No entry</Text>
              )}

              <Text style={styles.metaLabel}>
                {partner?.display_name ?? 'Partner'}
              </Text>
              {day.revealed && day.partner ? (
                <>
                  <Text style={styles.metaValue}>
                    {day.partner.score} · {SCORE_LABELS[day.partner.score]}
                  </Text>
                  {day.partner.note ? (
                    <Text style={styles.note}>{day.partner.note}</Text>
                  ) : null}
                </>
              ) : day.mine && user ? (
                <Text style={styles.muted}>Hidden until both submit</Text>
              ) : (
                <Text style={styles.muted}>No entry yet</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <SecondaryButton label="Refresh" onPress={() => void refresh()} />
      <SecondaryButton label="Back" onPress={() => router.back()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 16,
  },
  list: {
    paddingBottom: 16,
    gap: 12,
  },
  empty: {
    color: '#78716C',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D6D3D1',
  },
  date: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78716C',
    marginTop: 10,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1917',
  },
  note: {
    marginTop: 4,
    color: '#44403C',
    fontSize: 14,
    lineHeight: 20,
  },
  muted: {
    color: '#A8A29E',
    fontSize: 14,
  },
})
