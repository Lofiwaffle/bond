import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import {
  Card,
  ErrorText,
  Field,
  LoadingScreen,
  PrimaryButton,
  ScoreEmoji,
  ScoreFacePicker,
  Screen,
  SecondaryButton,
  Subtitle,
  Title,
} from '../../components/ui'
import { useTodayCheckIn } from '../../hooks/useCheckIn'
import { useWeeklyReview } from '../../hooks/useWeeklyReview'
import { useAuth } from '../../lib/auth'
import {
  DAILY_PROMPT,
  SCORE_LABELS,
  formatDisplayDate,
  localDateString,
} from '../../lib/dates'
import { syncCheckInReminder } from '../../lib/notifications'
import { colors, scoreColorsSoft } from '../../lib/theme'

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
  const {
    streak,
    unlocked,
    needsReview,
    bothSubmitted: weeklyBoth,
    waitingForPartner: weeklyWaiting,
    refresh: refreshWeekly,
  } = useWeeklyReview()
  const [score, setScore] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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
    const result = await submit(score, note)
    setSubmitting(false)
    if (result.error) setSubmitError(result.error)
  }

  return (
    <Screen>
      <Title>Check in</Title>
      <Subtitle>
        {DAILY_PROMPT} · {formatDisplayDate(localDateString())}
      </Subtitle>

      <ErrorText message={error} />

      {unlocked ? (
        <Card style={{ backgroundColor: scoreColorsSoft[5] }}>
          <Text style={styles.weeklyTitle}>
            {needsReview
              ? 'Weekly review unlocked 🎉'
              : weeklyWaiting
                ? 'Weekly review waiting on partner'
                : weeklyBoth
                  ? 'Weekly review complete'
                  : 'Weekly review'}
          </Text>
          <Text style={styles.weeklyBody}>
            {streak}-day streak · reflect together with private prompts that
            reveal when you both finish.
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
            Check in {7 - streak} more day{7 - streak === 1 ? '' : 's'} in a row
            to unlock your weekly reflection together ({streak}/7).
          </Text>
        </Card>
      )}

      {!mine ? (
        <Card style={{ backgroundColor: scoreColorsSoft[score ?? 3] }}>
          <Text style={styles.heroPrompt}>Pick a face</Text>
          <ScoreFacePicker value={score} onChange={setScore} />
          {score != null ? (
            <Text style={styles.scoreLabel}>
              {score} · {SCORE_LABELS[score]}
            </Text>
          ) : (
            <Text style={styles.scoreHint}>Tap how connected you felt</Text>
          )}

          {showNote ? (
            <>
              <Field
                value={note}
                onChangeText={setNote}
                placeholder="Optional note…"
                autoCapitalize="sentences"
                multiline
                style={styles.note}
              />
            </>
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
          <Text style={styles.waitingTitle}>Saved — waiting on partner</Text>
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
          {mine.note ? <Text style={styles.noteText}>{mine.note}</Text> : null}
        </Card>
      ) : null}

      {bothSubmitted && mine && partnerCheckIn ? (
        <Card>
          <Text style={styles.revealTitle}>Both checked in ✨</Text>
          <Text style={styles.metaLabel}>You</Text>
          <View style={styles.scoreLine}>
            <ScoreEmoji score={mine.score} size={40} />
            <Text style={styles.scoreText}>
              {mine.score} · {SCORE_LABELS[mine.score]}
            </Text>
          </View>
          {mine.note ? <Text style={styles.noteText}>{mine.note}</Text> : null}

          <Text style={styles.metaLabel}>{partner.display_name}</Text>
          <View style={styles.scoreLine}>
            <ScoreEmoji score={partnerCheckIn.score} size={40} />
            <Text style={styles.scoreText}>
              {partnerCheckIn.score} · {SCORE_LABELS[partnerCheckIn.score]}
            </Text>
          </View>
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
    </Screen>
  )
}

const styles = StyleSheet.create({
  weeklyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
  },
  weeklyBody: {
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 10,
  },
  heroPrompt: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 16,
    textAlign: 'center',
  },
  scoreLabel: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 12,
  },
  scoreHint: {
    textAlign: 'center',
    color: colors.muted,
    marginBottom: 12,
  },
  noteToggle: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 4,
  },
  noteToggleText: {
    color: colors.accentPressed,
    fontWeight: '700',
  },
  note: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: '800',
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
    fontWeight: '800',
    color: colors.accentPressed,
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
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
})
