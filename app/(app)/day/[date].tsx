import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'

import {
  ErrorText,
  LoadingScreen,
  PrimaryButton,
  ScoreMark,
  Screen,
  TextLink,
} from '../../../components/ui'
import { useDayDetail } from '../../../hooks/useCheckIn'
import { useAuth } from '../../../lib/auth'
import {
  SCORE_LABELS,
  formatDisplayDate,
  localDateString,
} from '../../../lib/dates'
import { colors, hairlineWidth, type } from '../../../lib/theme'

export default function DayDetailScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date: string }>()
  const date = typeof dateParam === 'string' ? dateParam : ''
  const { partner, isLoading: authLoading } = useAuth()
  const { detail, isLoading, error } = useDayDetail(date)
  const today = localDateString()

  if (authLoading || isLoading) return <LoadingScreen />
  if (!date) return <Redirect href="/(app)/(tabs)" />

  const isToday = date === today

  return (
    <Screen>
      <Text style={styles.title}>{formatDisplayDate(date)}</Text>
      <Text style={styles.subtitle}>
        {isToday ? "Today's check-in details" : 'Historical check-in and notes'}
      </Text>

      <ErrorText message={error} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {!detail?.mine && isToday ? (
          <View style={styles.section}>
            <Text style={styles.emptyTitle}>No check-in yet today</Text>
            <Text style={styles.emptyBody}>
              Save today's connection score to start building your streak.
            </Text>
            <PrimaryButton
              label="Check in now"
              onPress={() => router.push('/(app)/check-in')}
              disabled={!partner}
            />
          </View>
        ) : null}

        {!detail?.mine && !isToday ? (
          <View style={styles.section}>
            <Text style={styles.emptyTitle}>No entry this day</Text>
            <Text style={styles.emptyBody}>
              You didn't submit a check-in on this date.
            </Text>
          </View>
        ) : null}

        {detail?.mine ? (
          <>
            <View style={styles.section}>
              <Text style={styles.metaLabel}>You</Text>
              <View style={styles.scoreLine}>
                <ScoreMark score={detail.mine.score} size={28} />
                <Text style={styles.scoreText}>
                  {detail.mine.score} · {SCORE_LABELS[detail.mine.score]}
                </Text>
              </View>
              <Text style={styles.noteHeading}>Today's prompt</Text>
              <Text style={styles.note}>
                {detail.mine.prompt_text?.trim() || 'How connected did you feel?'}
              </Text>
              <Text style={styles.noteHeading}>Your answer</Text>
              <Text style={styles.note}>
                {detail.mine.prompt_answer?.trim() ||
                  detail.mine.note?.trim() ||
                  'No answer written.'}
              </Text>
            </View>

            <View style={styles.sectionLast}>
              <Text style={styles.metaLabel}>
                {partner?.display_name ?? 'Partner'}
              </Text>
              {detail.revealed && detail.partner ? (
                <>
                  <View style={styles.scoreLine}>
                    <ScoreMark score={detail.partner.score} size={28} />
                    <Text style={styles.scoreText}>
                      {detail.partner.score} ·{' '}
                      {SCORE_LABELS[detail.partner.score]}
                    </Text>
                  </View>
                  <Text style={styles.noteHeading}>Their answer</Text>
                  <Text style={styles.note}>
                    {detail.partner.prompt_answer?.trim() ||
                      detail.partner.note?.trim() ||
                      'No answer written.'}
                  </Text>
                </>
              ) : (
                <Text style={styles.hidden}>
                  Partner's answer stays hidden until you both checked in that
                  day.
                </Text>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <TextLink label="Back to feed" onPress={() => router.back()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: 12,
  },
  title: {
    ...type.heading,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginBottom: 8,
  },
  emptyTitle: {
    ...type.heading,
    marginBottom: 6,
  },
  emptyBody: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  sectionLast: {
    paddingVertical: 16,
  },
  metaLabel: {
    ...type.label,
    marginBottom: 8,
  },
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreText: {
    ...type.body,
    fontWeight: '500',
  },
  noteHeading: {
    marginTop: 14,
    ...type.label,
  },
  note: {
    marginTop: 4,
    ...type.body,
  },
  hidden: {
    ...type.body,
    color: colors.muted,
  },
})
