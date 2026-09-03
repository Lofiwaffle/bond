import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'

import {
  ExtrasStep,
  RevealMoment,
  ScoreStep,
  WaitingMoment,
  WordsStep,
} from '../../components/CheckInMoment'
import { CheckInSyncBanner } from '../../components/CheckInSyncBanner'
import { ConfirmDialog } from '../../components/ConfirmDialog'
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
  useCheckInGrowth,
  useTodayCheckIn,
  OPENED_WHILE_EDITING,
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
import {
  clearQueuedCheckIn,
  loadQueuedCheckIn,
  QUEUED_TOAST,
  useQueuedCheckIn,
} from '../../lib/checkInOutbox'
import { useOnline } from '../../lib/network'
import {
  MUTUAL_REVEAL_BODY,
  MUTUAL_REVEAL_CONFIRM,
  MUTUAL_REVEAL_TITLE,
} from '../../lib/privacy'
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
    revise,
    refresh,
    sendNudge,
    syncing,
  } = useTodayCheckIn()
  const { myCheckIns } = useCheckInGrowth()
  const online = useOnline()
  const { showToast } = useToast()
  const params = useLocalSearchParams<{ edit?: string | string[] }>()
  const wantEdit = (Array.isArray(params.edit) ? params.edit[0] : params.edit) === '1'
  const today = localDateString()
  const queued = useQueuedCheckIn(user?.id, today)
  const [score, setScore] = useState<number | null>(null)
  const [activities, setActivities] = useState<ActivityId[]>([])
  const [promptAnswer, setPromptAnswer] = useState('')
  const [noWords, setNoWords] = useState(false)
  const [step, setStep] = useState<CheckInDraft['step']>('words')
  const [draftReady, setDraftReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [nudged, setNudged] = useState(false)
  const [nudging, setNudging] = useState(false)
  const [editing, setEditing] = useState(false)
  const [revealOpen, setRevealOpen] = useState(false)
  const saving = useRef(false)
  const revealAcked = useRef(false)
  const openedWhileEditing = useRef(false)
  const startedFromQuery = useRef(false)

  useEffect(() => {
    if (!user?.id || authLoading || isLoading || mine) {
      setDraftReady(true)
      return
    }
    void Promise.all([
      loadCheckInDraft(user.id, today),
      loadQueuedCheckIn(user.id, today),
    ]).then(([draft, queuedEntry]) => {
      const emptyDraft =
        draft.score == null &&
        !draft.promptAnswer &&
        !draft.noWords &&
        draft.activities.length === 0 &&
        (draft.step === 'words' || draft.step === 'score')
      const source =
        emptyDraft && queuedEntry
          ? {
              score: queuedEntry.score,
              activities: queuedEntry.activities as ActivityId[],
              promptAnswer: queuedEntry.prompt_answer ?? '',
              noWords: !queuedEntry.prompt_answer,
              step: 'extras' as const,
            }
          : draft
      setScore(source.score)
      setActivities(source.activities)
      setPromptAnswer(source.promptAnswer)
      setNoWords(source.noWords)
      setStep(source.step)
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

  const beginEdit = useCallback(() => {
    if (!mine || !waitingForPartner) return
    openedWhileEditing.current = false
    setScore(mine.score)
    setActivities((mine.activities ?? []) as ActivityId[])
    setPromptAnswer(mine.prompt_answer ?? '')
    setNoWords(!(mine.prompt_answer && mine.prompt_answer.length > 0))
    setStep('words')
    setSubmitError(null)
    setEditing(true)
  }, [mine, waitingForPartner])

  useEffect(() => {
    if (!wantEdit || startedFromQuery.current || editing) return
    if (!mine || !waitingForPartner) return
    startedFromQuery.current = true
    beginEdit()
  }, [beginEdit, editing, mine, waitingForPartner, wantEdit])

  useEffect(() => {
    if (!editing || !bothSubmitted || openedWhileEditing.current) return
    openedWhileEditing.current = true
    setEditing(false)
    showToast(OPENED_WHILE_EDITING)
  }, [bothSubmitted, editing, showToast])

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
    setStep('words')
    setSubmitError(null)
    if (user?.id) {
      void clearCheckInDraft(user.id, today)
      void clearQueuedCheckIn(user.id, today)
    }
  }

  const needsRevealAck = !editing && !queued && myCheckIns === 0

  const onSubmit = async () => {
    if (saving.current || submitting) return
    if (score == null) {
      setSubmitError('Choose how connected you feel')
      setStep('score')
      return
    }
    if (needsRevealAck && !revealAcked.current) {
      setRevealOpen(true)
      return
    }
    setRevealOpen(false)
    setSubmitError(null)
    saving.current = true
    setSubmitting(true)
    const result = editing
      ? await revise(score, '', activities, {
          id: todayPrompt.id,
          text: todayPrompt.text,
          answer: noWords ? '' : promptAnswer,
        })
      : await submit(score, '', activities, {
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
    if ('opened' in result && result.opened) {
      if (!openedWhileEditing.current) {
        openedWhileEditing.current = true
        showToast(OPENED_WHILE_EDITING)
      }
      setEditing(false)
      return
    }
    if ('queued' in result && result.queued) {
      showToast(QUEUED_TOAST)
      return
    }
    if (user?.id) await clearCheckInDraft(user.id, today)
    setEditing(false)
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

  const composing = (!mine || editing) && !bothSubmitted

  return (
    <Screen style={styles.screen} keyboard>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.heading}>
              {editing ? 'Correct check-in' : 'Check-in'}
            </Text>
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

        {error && !queued ? (
          <StatusPanel
            message="Couldn't load today's check-in."
            onRetry={() => void refresh()}
          />
        ) : null}

        <CheckInSyncBanner
          queued={queued}
          syncing={syncing}
          online={online}
          allowDraft={composing}
        />
        {error && queued ? (
          <Text style={styles.queuedHint}>
            Couldn't refresh from Bond. Your saved check-in is still on this
            device.
          </Text>
        ) : null}

        {composing ? (
          <>
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
                  setStep('score')
                }}
              />
            ) : null}
            {step === 'score' ? (
              <ScoreStep
                value={score}
                onChange={setScore}
              />
            ) : null}
            {step === 'extras' ? (
              <ExtrasStep
                value={activities}
                onChange={setActivities}
                error={submitError}
              />
            ) : null}

            {step === 'words' ? (
              <PrimaryButton
                label="Continue"
                onPress={() => setStep('score')}
              />
            ) : null}
            {step === 'score' ? (
              <PrimaryButton
                label="Continue"
                onPress={() => setStep('extras')}
                disabled={score == null}
              />
            ) : null}
            {step === 'extras' ? (
              <>
                <PrimaryButton
                  label={
                    editing
                      ? 'Save correction'
                      : queued
                        ? 'Update what will send'
                        : activities.length
                          ? 'Save check-in'
                          : 'Skip activities and save'
                  }
                  onPress={() => void onSubmit()}
                  loading={submitting}
                  disabled={score == null}
                />
              </>
            ) : null}

            {step !== 'words' ? (
              <TextLink
                label="Back"
                onPress={() =>
                  setStep(step === 'extras' ? 'score' : 'words')
                }
              />
            ) : editing ? (
              <TextLink
                label="Keep what I saved"
                onPress={() => {
                  setEditing(false)
                  setSubmitError(null)
                }}
              />
            ) : (
              <TextLink label="Not today" onPress={() => router.back()} />
            )}
          </>
        ) : null}

        {mine && waitingForPartner && !editing ? (
          <WaitingMoment
            mine={mine}
            partnerName={partner.display_name}
            userId={user?.id ?? ''}
            nudged={nudged}
            nudging={nudging}
            onNudge={() => void onNudge()}
            onRefresh={() => void refresh()}
            onEdit={beginEdit}
            onDone={() => router.back()}
          />
        ) : null}

        {bothSubmitted && mine && partnerCheckIn && user?.id ? (
          <>
            <RevealMoment
              mine={mine}
              partner={partnerCheckIn}
              partnerName={partner.display_name}
            />
            <TextLink label="Done" onPress={() => router.back()} />
          </>
        ) : null}
      </ScrollView>
      <ConfirmDialog
        visible={revealOpen}
        title={MUTUAL_REVEAL_TITLE}
        body={MUTUAL_REVEAL_BODY}
        confirmLabel={MUTUAL_REVEAL_CONFIRM}
        cancelLabel="Not yet"
        onCancel={() => setRevealOpen(false)}
        onConfirm={() => {
          revealAcked.current = true
          setRevealOpen(false)
          void onSubmit()
        }}
      />
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
  queuedHint: {
    ...type.label,
    color: colors.muted,
    marginBottom: 12,
  },
})
