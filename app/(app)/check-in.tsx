import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import {
  ActivityChips,
  Divider,
  ErrorText,
  Field,
  IconButton,
  LoadingScreen,
  PrimaryButton,
  ProgressBar,
  ReadOnlyChips,
  ScoreMark,
  ScoreScale,
  Screen,
  StreakChip,
  TextLink,
} from '../../components/ui'
import type { ActivityId } from '../../lib/activities'
import {
  computeStreak,
  useCheckInHistory,
  useTodayCheckIn,
} from '../../hooks/useCheckIn'
import { useWeeklyReview } from '../../hooks/useWeeklyReview'
import { useAuth } from '../../lib/auth'
import { promptForDate } from '../../lib/dailyPrompts'
import {
  SCORE_LABELS,
  formatDisplayDate,
  localDateString,
} from '../../lib/dates'
import { syncCheckInReminder } from '../../lib/notifications'
import { colors, type } from '../../lib/theme'

export default function CheckInScreen() {
  const { profile, partner, isLoading: authLoading } = useAuth()
  const {
    mine,
    partnerCheckIn,
    bothSubmitted,
    waitingForPartner,
    isLoading,
    error,
    submit,
  } = useTodayCheckIn()
  const { days } = useCheckInHistory()
  const { streak: weeklyStreak, unlocked, needsReview } = useWeeklyReview()
  const [score, setScore] = useState<number | null>(null)
  const [activities, setActivities] = useState<ActivityId[]>([])
  const [promptAnswer, setPromptAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const streak = useMemo(() => {
    const today = localDateString()
    const myDates = days.filter((d) => d.mine).map((d) => d.date)
    return computeStreak(myDates, today)
  }, [days])

  const towardReview = weeklyStreak === 0 ? 0 : ((weeklyStreak - 1) % 7) + 1
  const hasDraft = score != null || activities.length > 0 || promptAnswer.trim().length > 0

  useEffect(() => {
    if (isLoading || authLoading) return
    void syncCheckInReminder(Boolean(mine))
  }, [authLoading, isLoading, mine])

  if (authLoading || isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/pair" />

  if (!partner) {
    return (
      <Screen>
        <Text style={styles.heading}>Check-in</Text>
        <Text style={styles.mutedBody}>
          Waiting for your partner to join before check-ins unlock.
        </Text>
        <TextLink label="Close" onPress={() => router.back()} />
      </Screen>
    )
  }

  const todayPrompt = promptForDate(profile.couple_id, localDateString())

  const resetForm = () => {
    setScore(null)
    setActivities([])
    setPromptAnswer('')
    setSubmitError(null)
  }

  const onSubmit = async () => {
    if (score == null) {
      setSubmitError('Choose how connected you feel')
      return
    }
    setSubmitError(null)
    setSubmitting(true)
    const result = await submit(score, '', activities, {
      id: todayPrompt.id,
      text: todayPrompt.text,
      answer: promptAnswer,
    })
    setSubmitting(false)
    if (result.error) {
      setSubmitError(result.error)
      return
    }
    router.dismissTo('/(app)/(tabs)')
  }

  const openWeekly = () => router.push('/(app)/weekly-review')

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.heading}>Check-in</Text>
            <Text style={styles.date}>{formatDisplayDate(localDateString())}</Text>
          </View>
          <View style={styles.headerMeta}>
            {hasDraft && !mine ? (
              <IconButton
                name="rotate-ccw"
                accessibilityLabel="Reset form"
                onPress={resetForm}
              />
            ) : null}
            <StreakChip streak={streak} />
          </View>
        </View>

        <Pressable
          accessibilityRole={unlocked ? 'button' : undefined}
          accessibilityLabel={
            unlocked
              ? needsReview
                ? 'Weekly review unlocked'
                : 'Open weekly review'
              : `${towardReview} of 7 days to weekly reflection`
          }
          onPress={unlocked ? openWeekly : undefined}
          disabled={!unlocked}
          style={styles.progressBlock}
        >
          <ProgressBar
            value={towardReview}
            max={7}
            label={`${towardReview}/7 to reflection`}
          />
        </Pressable>

        <Divider />

        <ErrorText message={error} />

        {!mine ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Today's prompt</Text>
              <Text style={styles.prompt}>{todayPrompt.text}</Text>
              <Field
                value={promptAnswer}
                onChangeText={setPromptAnswer}
                placeholder="Answer in a few sentences"
                autoCapitalize="sentences"
                multiline
                maxLength={500}
                style={styles.note}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                How connected do you feel today?
              </Text>
              <ScoreScale value={score} onChange={setScore} />
            </View>

            <View style={[styles.section, styles.sectionLast]}>
              <Text style={styles.sectionLabel}>Tap what shaped today</Text>
              <ActivityChips value={activities} onChange={setActivities} />
            </View>

            <ErrorText message={submitError} />
            <PrimaryButton
              label="Save check-in"
              onPress={onSubmit}
              loading={submitting}
              disabled={score == null}
            />
            <TextLink label="Skip for today" onPress={() => router.back()} />
          </>
        ) : null}

        {mine && waitingForPartner ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Saved</Text>
              <Text style={styles.prompt}>
                Waiting on {partner.display_name}. They can't see this until they
                check in too.
              </Text>
              <ScoreLine score={mine.score} />
              <ReadOnlyChips ids={mine.activities ?? []} />
            </View>
            <View style={[styles.section, styles.sectionLast]}>
              <PromptAnswer
                promptText={mine.prompt_text ?? todayPrompt.text}
                answer={mine.prompt_answer}
              />
            </View>
            <TextLink label="Done" onPress={() => router.back()} />
          </>
        ) : null}

        {bothSubmitted && mine && partnerCheckIn ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>You</Text>
              <ScoreLine score={mine.score} />
              <ReadOnlyChips ids={mine.activities ?? []} />
              <PromptAnswer
                promptText={mine.prompt_text ?? todayPrompt.text}
                answer={mine.prompt_answer}
              />
            </View>
            <View style={[styles.section, styles.sectionLast]}>
              <Text style={styles.sectionLabel}>{partner.display_name}</Text>
              <ScoreLine score={partnerCheckIn.score} />
              <ReadOnlyChips ids={partnerCheckIn.activities ?? []} />
              <PromptAnswer
                promptText={partnerCheckIn.prompt_text ?? todayPrompt.text}
                answer={partnerCheckIn.prompt_answer}
              />
            </View>
            <TextLink label="Done" onPress={() => router.back()} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  )
}

function ScoreLine({ score }: { score: number }) {
  return (
    <View style={styles.scoreLine}>
      <ScoreMark score={score} size={28} />
      <Text style={styles.body}>
        {score} · {SCORE_LABELS[score]}
      </Text>
    </View>
  )
}

function PromptAnswer({
  promptText,
  answer,
}: {
  promptText: string
  answer: string | null
}) {
  return (
    <View style={styles.promptBlock}>
      <Text style={styles.sectionLabel}>{promptText}</Text>
      <Text style={styles.body}>
        {answer?.trim() ? answer : 'No answer written.'}
      </Text>
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  headerMeta: {
    alignItems: 'flex-end',
    gap: 4,
    paddingTop: 4,
  },
  heading: {
    ...type.heading,
  },
  date: {
    ...type.body,
    color: colors.muted,
    marginTop: 2,
  },
  mutedBody: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  body: {
    ...type.body,
  },
  progressBlock: {
    marginTop: 16,
    marginBottom: 16,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  sectionLast: {
    borderBottomWidth: 0,
    marginBottom: 8,
  },
  sectionLabel: {
    ...type.label,
    marginBottom: 8,
  },
  prompt: {
    ...type.body,
    marginBottom: 12,
  },
  note: {
    minHeight: 88,
    textAlignVertical: 'top',
    marginBottom: 0,
  },
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  promptBlock: {
    gap: 6,
  },
})
