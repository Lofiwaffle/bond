import { useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import {
  ExtrasStep,
  RevealMoment,
  ScoreStep,
  WaitingMoment,
  WordsStep,
} from '../../components/CheckInMoment'
import {
  IconButton,
  LoadingScreen,
  PrimaryButton,
  Screen,
  StatusPanel,
  TextLink,
} from '../../components/ui'
import type { ActivityId } from '../../lib/activities'
import {
  useTodayCheckIn,
} from '../../hooks/useCheckIn'
import { useAuth } from '../../lib/auth'
import {
  clearCheckInDraft,
  hasSentNudge,
  loadCheckInDraft,
  markNudgeSent,
  saveCheckInDraft,
  type CheckInDraft,
} from '../../lib/checkInDraft'
import { promptForDate } from '../../lib/dailyPrompts'
import { formatDisplayDate, localDateString } from '../../lib/dates'
import { syncCheckInReminder } from '../../lib/notifications'
import { useToast } from '../../lib/toast'
import { colors, type } from '../../lib/theme'

export default function CheckInScreen() {
  const { user, profile, partner, isLoading: authLoading } = useAuth()
  const {
    mine,
    partnerCheckIn,
    bothSubmitted,
    waitingForPartner,
    isLoading,
    error,
    submit,
    refresh,
    sendNudge,
  } = useTodayCheckIn()
  const { showToast } = useToast()
  const [score, setScore] = useState<number | null>(null)
  const [activities, setActivities] = useState<ActivityId[]>([])
  const [promptAnswer, setPromptAnswer] = useState('')
  const [noWords, setNoWords] = useState(false)
  const [step, setStep] = useState<CheckInDraft['step']>('score')
  const [draftReady, setDraftReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [nudged, setNudged] = useState(false)
  const [nudging, setNudging] = useState(false)
  const saving = useRef(false)
  const today = localDateString()

  useEffect(() => {
    if (!user?.id || authLoading || isLoading || mine) {
      setDraftReady(true)
      return
    }
    void loadCheckInDraft(user.id, today).then((draft) => {
      setScore(draft.score)
      setActivities(draft.activities)
      setPromptAnswer(draft.promptAnswer)
      setNoWords(draft.noWords)
      setStep(draft.step)
      setDraftReady(true)
    })
  }, [authLoading, isLoading, mine, today, user?.id])

  useEffect(() => {
    if (!draftReady || !user?.id || mine) return
    void saveCheckInDraft(user.id, {
      date: today,
      score,
      activities,
      promptAnswer,
      noWords,
      step,
    })
  }, [activities, draftReady, mine, noWords, promptAnswer, score, step, today, user?.id])

  useEffect(() => {
    if (!user?.id || !mine) return
    void hasSentNudge(user.id, today).then(setNudged)
  }, [mine, today, user?.id])

  useEffect(() => {
    if (isLoading || authLoading) return
    void syncCheckInReminder(Boolean(mine))
  }, [authLoading, isLoading, mine])

  if (authLoading || isLoading || !draftReady) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  if (!partner) {
    return (
      <Screen>
        <Text style={styles.heading}>Check-in</Text>
        <Text style={styles.mutedBody}>
          Invite your person first. Check-ins open when there are two of you.
        </Text>
        <TextLink label="Close" onPress={() => router.back()} />
      </Screen>
    )
  }

  const todayPrompt = promptForDate(profile.couple_id, today)

  const resetForm = () => {
    setScore(null)
    setActivities([])
    setPromptAnswer('')
    setNoWords(false)
    setStep('score')
    setSubmitError(null)
    if (user?.id) void clearCheckInDraft(user.id, today)
  }

  const onSubmit = async () => {
    if (saving.current || submitting) return
    if (score == null) {
      setSubmitError('Choose how connected you feel')
      setStep('score')
      return
    }
    setSubmitError(null)
    saving.current = true
    setSubmitting(true)
    const result = await submit(score, '', activities, {
      id: todayPrompt.id,
      text: todayPrompt.text,
      answer: noWords ? '' : promptAnswer,
    })
    saving.current = false
    setSubmitting(false)
    if (result.error) {
      setSubmitError(result.error)
      return
    }
    if (user?.id) await clearCheckInDraft(user.id, today)
    showToast('Saved. Private until they check in too.')
  }

  const onNudge = async () => {
    if (!user?.id || nudged || nudging) return
    setNudging(true)
    const result = await sendNudge()
    setNudging(false)
    if (result.error) {
      showToast("Couldn't send a reminder right now.")
      return
    }
    await markNudgeSent(user.id, today)
    setNudged(true)
    showToast('Gentle reminder sent')
  }

  return (
    <Screen style={styles.screen} keyboard>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.heading}>Check-in</Text>
            <Text style={styles.date}>{formatDisplayDate(today)}</Text>
          </View>
          <View style={styles.headerMeta}>
            {!mine && (score != null || promptAnswer || noWords) ? (
              <IconButton
                name="rotate-ccw"
                accessibilityLabel="Start over"
                onPress={resetForm}
              />
            ) : null}
            <IconButton
              name="x"
              accessibilityLabel="Close"
              onPress={() => router.back()}
            />
          </View>
        </View>

        {error ? (
          <StatusPanel
            message="Couldn't load today's check-in."
            onRetry={() => void refresh()}
          />
        ) : null}

        {!mine ? (
          <>
            {step === 'score' ? (
              <ScoreStep value={score} onChange={setScore} />
            ) : null}
            {step === 'words' ? (
              <WordsStep
                prompt={todayPrompt.text}
                value={promptAnswer}
                noWords={noWords}
                onChange={(text) => {
                  setNoWords(false)
                  setPromptAnswer(text)
                }}
                onNoWords={() => {
                  if (noWords) {
                    setNoWords(false)
                    return
                  }
                  setNoWords(true)
                  setPromptAnswer('')
                  setStep('extras')
                }}
              />
            ) : null}
            {step === 'extras' ? (
              <ExtrasStep
                value={activities}
                onChange={setActivities}
                error={submitError}
              />
            ) : null}

            {step === 'score' ? (
              <PrimaryButton
                label="Continue"
                onPress={() => setStep('words')}
                disabled={score == null}
              />
            ) : null}
            {step === 'words' ? (
              <PrimaryButton
                label="Continue"
                onPress={() => setStep('extras')}
              />
            ) : null}
            {step === 'extras' ? (
              <PrimaryButton
                label={activities.length ? 'Save check-in' : 'Skip activities and save'}
                onPress={() => void onSubmit()}
                loading={submitting}
                disabled={score == null}
              />
            ) : null}

            {step !== 'score' ? (
              <TextLink
                label="Back"
                onPress={() =>
                  setStep(step === 'extras' ? 'words' : 'score')
                }
              />
            ) : (
              <TextLink label="Not today" onPress={() => router.back()} />
            )}
          </>
        ) : null}

        {mine && waitingForPartner ? (
          <WaitingMoment
            mine={mine}
            partnerName={partner.display_name}
            userId={user?.id ?? ''}
            nudged={nudged}
            nudging={nudging}
            onNudge={() => void onNudge()}
            onRefresh={() => void refresh()}
            onDone={() => router.back()}
          />
        ) : null}

        {bothSubmitted && mine && partnerCheckIn && user?.id ? (
          <>
            <RevealMoment
              mine={mine}
              partner={partnerCheckIn}
              partnerName={partner.display_name}
              userId={user.id}
            />
            <TextLink label="Done" onPress={() => router.back()} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
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
    marginBottom: 12,
  },
  headerCopy: {
    flex: 1,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
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
})
