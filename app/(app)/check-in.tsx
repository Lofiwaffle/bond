import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import {
  ActivityIconGrid,
  Card,
  ErrorText,
  Field,
  LoadingScreen,
  PrimaryButton,
  ScoreEmoji,
  ScoreFacePicker,
  Screen,
  SecondaryButton,
  StreakChip,
  Subtitle,
  Title,
} from '../../components/ui'
import type { ActivityId } from '../../lib/activities'
import { activityById } from '../../lib/activities'
import {
  computeStreak,
  useCheckInHistory,
  useTodayCheckIn,
} from '../../hooks/useCheckIn'
import { useWeeklyReview } from '../../hooks/useWeeklyReview'
import { useAuth } from '../../lib/auth'
import {
  DAILY_PROMPT,
  SCORE_LABELS,
  formatDisplayDate,
  localDateString,
} from '../../lib/dates'
import { syncCheckInReminder } from '../../lib/notifications'
import { colors } from '../../lib/theme'

export default function CheckInScreen() {
  const { profile, partner, isLoading: authLoading } = useAuth()
  const {
    mine,
    partnerCheckIn,
    bothSubmitted,
    waitingForPartner,
    isLoading,
    error,
    refresh,
    submit,
  } = useTodayCheckIn()
  const { days } = useCheckInHistory()
  const {
    streak: weeklyStreak,
    unlocked,
    needsReview,
    bothSubmitted: weeklyBoth,
    waitingForPartner: weeklyWaiting,
    refresh: refreshWeekly,
  } = useWeeklyReview()
  const [score, setScore] = useState<number | null>(null)
  const [activities, setActivities] = useState<ActivityId[]>([])
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const streak = useMemo(() => {
    const today = localDateString()
    const myDates = days.filter((d) => d.mine).map((d) => d.date)
    return computeStreak(myDates, today)
  }, [days])

  useEffect(() => {
    if (isLoading || authLoading) return
    void syncCheckInReminder(Boolean(mine))
  }, [authLoading, isLoading, mine])

  if (authLoading || isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/pair" />

  if (!partner) {
    return (
      <Screen>
        <Title>Check in</Title>
        <Subtitle>
          Waiting for your partner to join before check-ins unlock.
        </Subtitle>
        <SecondaryButton label="Close" onPress={() => router.back()} />
      </Screen>
    )
  }

  const onSubmit = async () => {
    if (score == null) {
      setSubmitError('Pick a face that fits today')
      return
    }
    setSubmitError(null)
    setSubmitting(true)
    const result = await submit(score, note, activities)
    setSubmitting(false)
    if (result.error) setSubmitError(result.error)
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Title>Check in</Title>
          <StreakChip streak={streak} />
        </View>
        <Subtitle>
          {DAILY_PROMPT} · {formatDisplayDate(localDateString())}
        </Subtitle>

        <ErrorText message={error} />

        {unlocked ? (
          <Card>
            <Text style={styles.weeklyTitle}>
              {needsReview
                ? 'Weekly review unlocked'
                : weeklyWaiting
                  ? 'Weekly review waiting on partner'
                  : weeklyBoth
                    ? 'Weekly review complete'
                    : 'Weekly review'}
            </Text>
            <Text style={styles.weeklyBody}>
              {weeklyStreak}-day streak · reflect together with private prompts
              that reveal when you both finish.
            </Text>
            <PrimaryButton
              label={
                needsReview
                  ? 'Start weekly check-in'
                  : weeklyBoth
                    ? 'View weekly review'
                    : 'Open weekly review'
              }
              onPress={() => router.push('/(app)/weekly-review')}
            />
          </Card>
        ) : (
          <Card>
            <Text style={styles.weeklyTitle}>Weekly review</Text>
            <Text style={styles.weeklyBody}>
              Check in {7 - weeklyStreak} more day
              {7 - weeklyStreak === 1 ? '' : 's'} in a row to unlock your weekly
              reflection together ({weeklyStreak}/7).
            </Text>
          </Card>
        )}

        {!mine ? (
          <Card>
            <Text style={styles.heroPrompt}>How connected do you feel?</Text>
            <ScoreFacePicker value={score} onChange={setScore} />
            {score != null ? (
              <Text style={styles.scoreLabel}>
                {score} · {SCORE_LABELS[score]}
              </Text>
            ) : (
              <Text style={styles.scoreHint}>Tap a face</Text>
            )}

            <Text style={styles.sectionLabel}>Activities</Text>
            <Text style={styles.sectionHint}>
              Tap tags that shaped today. No typing required.
            </Text>
            <ActivityIconGrid value={activities} onChange={setActivities} />

            {showNote ? (
              <Field
                value={note}
                onChangeText={setNote}
                placeholder="Optional note…"
                autoCapitalize="sentences"
                multiline
                style={styles.note}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowNote(true)}
                style={styles.noteToggle}
              >
                <Text style={styles.noteToggleText}>+ Add a note</Text>
              </Pressable>
            )}

            <ErrorText message={submitError} />
            <PrimaryButton
              label="Save"
              onPress={onSubmit}
              loading={submitting}
              disabled={score == null}
            />
          </Card>
        ) : null}

        {mine && waitingForPartner ? (
          <Card>
            <Text style={styles.waitingTitle}>Saved. Waiting on partner</Text>
            <View style={styles.scoreLine}>
              <ScoreEmoji score={mine.score} size={44} />
              <View>
                <Text style={styles.scoreText}>
                  {mine.score} · {SCORE_LABELS[mine.score]}
                </Text>
                <Text style={styles.waitingBody}>
                  {partner.display_name} can’t see this until they check in too.
                </Text>
              </View>
            </View>
            <ActivityChips ids={mine.activities ?? []} />
            {mine.note ? <Text style={styles.noteText}>{mine.note}</Text> : null}
          </Card>
        ) : null}

        {bothSubmitted && mine && partnerCheckIn ? (
          <Card>
            <Text style={styles.revealTitle}>Both checked in</Text>
            <Text style={styles.metaLabel}>You</Text>
            <View style={styles.scoreLine}>
              <ScoreEmoji score={mine.score} size={40} />
              <Text style={styles.scoreText}>
                {mine.score} · {SCORE_LABELS[mine.score]}
              </Text>
            </View>
            <ActivityChips ids={mine.activities ?? []} />
            {mine.note ? <Text style={styles.noteText}>{mine.note}</Text> : null}

            <Text style={styles.metaLabel}>{partner.display_name}</Text>
            <View style={styles.scoreLine}>
              <ScoreEmoji score={partnerCheckIn.score} size={40} />
              <Text style={styles.scoreText}>
                {partnerCheckIn.score} · {SCORE_LABELS[partnerCheckIn.score]}
              </Text>
            </View>
            <ActivityChips ids={partnerCheckIn.activities ?? []} />
            {partnerCheckIn.note ? (
              <Text style={styles.noteText}>{partnerCheckIn.note}</Text>
            ) : null}
          </Card>
        ) : null}

        <SecondaryButton
          label="Refresh"
          onPress={() => {
            void refresh()
            void refreshWeekly()
          }}
        />
        <SecondaryButton label="Done" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  )
}

function ActivityChips({ ids }: { ids: string[] }) {
  if (!ids.length) return null
  return (
    <View style={styles.chipRow}>
      {ids.map((id) => {
        const activity = activityById(id)
        if (!activity) return null
        return (
          <View key={id} style={styles.chip}>
            <Text style={styles.chipText}>
              {activity.glyph} {activity.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: 48,
    paddingHorizontal: 0,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  weeklyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 6,
  },
  weeklyBody: {
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 10,
  },
  heroPrompt: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 16,
    textAlign: 'center',
  },
  scoreLabel: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 16,
  },
  scoreHint: {
    textAlign: 'center',
    color: colors.muted,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 10,
  },
  noteToggle: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 4,
  },
  noteToggleText: {
    color: colors.accent,
    fontWeight: '700',
  },
  note: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 12,
  },
  waitingBody: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
    maxWidth: 220,
  },
  revealTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  noteText: {
    marginTop: 8,
    color: colors.ink,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
})
