import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'

import {
  Card,
  ErrorText,
  LoadingScreen,
  PrimaryButton,
  ScoreEmoji,
  Screen,
  SecondaryButton,
  Subtitle,
  Title,
} from '../../../components/ui'
import { useDayDetail } from '../../../hooks/useWeeklyReview'
import { useAuth } from '../../../lib/auth'
import {
  SCORE_LABELS,
  formatDisplayDate,
  localDateString,
} from '../../../lib/dates'
import { colors } from '../../../lib/theme'

export default function DayDetailScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date: string }>()
  const date = typeof dateParam === 'string' ? dateParam : ''
  const { partner, isLoading: authLoading } = useAuth()
  const { detail, isLoading, error, refresh } = useDayDetail(date)
  const today = localDateString()

  if (authLoading || isLoading) return <LoadingScreen />
  if (!date) return <Redirect href="/(app)/(tabs)" />

  const isToday = date === today

  return (
    <Screen>
      <Title>{formatDisplayDate(date)}</Title>
      <Subtitle>
        {isToday
          ? "Today's check-in details"
          : 'Historical check-in and notes'}
      </Subtitle>

      <ErrorText message={error} />

      <ScrollView contentContainerStyle={styles.body}>
        {!detail?.mine && isToday ? (
          <Card>
            <Text style={styles.emptyTitle}>No check-in yet today</Text>
            <Text style={styles.emptyBody}>
              Save today’s connection face to start building your streak.
            </Text>
            <PrimaryButton
              label="Check in now"
              onPress={() => router.push('/(app)/check-in')}
              disabled={!partner}
            />
          </Card>
        ) : null}

        {!detail?.mine && !isToday ? (
          <Card>
            <Text style={styles.emptyTitle}>No entry this day</Text>
            <Text style={styles.emptyBody}>
              You didn’t submit a check-in on this date.
            </Text>
          </Card>
        ) : null}

        {detail?.mine ? (
          <Card>
            <Text style={styles.metaLabel}>You</Text>
            <View style={styles.scoreLine}>
              <ScoreEmoji score={detail.mine.score} size={44} />
              <Text style={styles.scoreText}>
                {detail.mine.score} · {SCORE_LABELS[detail.mine.score]}
              </Text>
            </View>
            <Text style={styles.noteHeading}>Your note</Text>
            <Text style={styles.note}>
              {detail.mine.note?.trim()
                ? detail.mine.note
                : 'No note written.'}
            </Text>

            <Text style={styles.metaLabel}>
              {partner?.display_name ?? 'Partner'}
            </Text>
            {detail.revealed && detail.partner ? (
              <>
                <View style={styles.scoreLine}>
                  <ScoreEmoji score={detail.partner.score} size={44} />
                  <Text style={styles.scoreText}>
                    {detail.partner.score} ·{' '}
                    {SCORE_LABELS[detail.partner.score]}
                  </Text>
                </View>
                <Text style={styles.noteHeading}>Their note</Text>
                <Text style={styles.note}>
                  {detail.partner.note?.trim()
                    ? detail.partner.note
                    : 'No note written.'}
                </Text>
              </>
            ) : (
              <Text style={styles.hidden}>
                Partner's answer stays hidden until you both checked in that
                day.
              </Text>
            )}
          </Card>
        ) : null}
      </ScrollView>

      <SecondaryButton label="Refresh" onPress={() => void refresh()} />
      <SecondaryButton label="Back to feed" onPress={() => router.back()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
  },
  emptyBody: {
    color: colors.muted,
    marginBottom: 12,
    lineHeight: 20,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  noteHeading: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  note: {
    marginTop: 4,
    color: colors.ink,
    lineHeight: 22,
    fontSize: 16,
  },
  hidden: {
    color: colors.muted,
    fontStyle: 'italic',
    lineHeight: 20,
  },
})
