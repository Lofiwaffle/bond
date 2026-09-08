import { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'

import { CheckInComposer, CheckInSaved } from '../../components/CheckInComposer'
import {
  RevealMoment,
  WaitingMoment,
} from '../../components/CheckInMoment'
import { CheckInSyncBanner } from '../../components/CheckInSyncBanner'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import {
  IconButton,
  LoadingScreen,
  Screen,
  StatusPanel,
  TextLink,
} from '../../components/ui'
import type { ActivityId } from '../../lib/activities'
import {
  OPENED_WHILE_EDITING,
  useCheckInGrowth,
  useTodayCheckIn,
} from '../../hooks/useCheckIn'
import { useAuth } from '../../lib/auth'
import {
  canSaveCheckIn,
  DISCARD_BODY,
  DISCARD_CONFIRM,
  DISCARD_STAY,
  DISCARD_TITLE,
  EMPTY_CHECK_IN_FORM,
  isCheckInDirty,
  KEEP_SAVED_LABEL,
  noteForSubmit,
  otherTextFromSaved,
  promptAnswerForSubmit,
  REFLECTION_PROMPT,
  REFLECTION_PROMPT_ID,
  SAVE_ERROR,
  SKIP_LABEL,
  validateCheckIn,
  type CheckInFormState,
} from '../../lib/checkInForm'
import {
  clearCheckInDraft,
  hasSentNudge,
  loadCheckInDraft,
  markNudgeSent,
  saveCheckInDraft,
} from '../../lib/checkInDraft'
import { formatDisplayDate, localDateString } from '../../lib/dates'
import {
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
import { useLeaveGuard } from '../../lib/useLeaveGuard'

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
  const [form, setForm] = useState<CheckInFormState>(EMPTY_CHECK_IN_FORM)
  const [draftReady, setDraftReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [feelingError, setFeelingError] = useState(false)
  const [nudged, setNudged] = useState(false)
  const [nudging, setNudging] = useState(false)
  const [editing, setEditing] = useState(false)
  const [revealOpen, setRevealOpen] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
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
        draft.step === 'score'
      const source =
        emptyDraft && queuedEntry
          ? {
              score: queuedEntry.score,
              activities: queuedEntry.activities as ActivityId[],
              promptAnswer: queuedEntry.prompt_answer ?? '',
              noWords: !queuedEntry.prompt_answer,
              otherText: queuedEntry.note ?? '',
            }
          : draft
      setForm({
        score: source.score,
        activities: source.activities,
        promptAnswer: source.promptAnswer,
        noWords: source.noWords,
        otherText: 'otherText' in source ? source.otherText : draft.otherText,
      })
      setDraftReady(true)
    })
  }, [authLoading, isLoading, mine, today, user?.id])

  useEffect(() => {
    if (!draftReady || !user?.id || mine) return
    void saveCheckInDraft(user.id, {
      date: today,
      score: form.score,
      activities: form.activities,
      promptAnswer: form.promptAnswer,
      noWords: form.noWords,
      otherText: form.otherText,
      step: 'extras',
    })
  }, [draftReady, form, mine, today, user?.id])

  useEffect(() => {
    if (!user?.id || !mine) return
    void hasSentNudge(user.id, today).then(setNudged)
  }, [mine, today, user?.id])

  const formFromMine = useCallback((): CheckInFormState => {
    if (!mine) return EMPTY_CHECK_IN_FORM
    const promptAnswer = mine.prompt_answer ?? ''
    return {
      score: mine.score,
      activities: (mine.activities ?? []) as ActivityId[],
      promptAnswer,
      noWords: !promptAnswer,
      otherText: otherTextFromSaved({
        activities: mine.activities,
        note: mine.note,
        promptAnswer: mine.prompt_answer,
      }),
    }
  }, [mine])

  const beginEdit = useCallback(() => {
    if (!mine || !waitingForPartner) return
    openedWhileEditing.current = false
    setForm(formFromMine())
    setSubmitError(null)
    setFeelingError(false)
    setJustSaved(false)
    setEditing(true)
  }, [formFromMine, mine, waitingForPartner])

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

  const composing =
    Boolean(partner) && (!mine || editing) && !bothSubmitted && !justSaved
  const {
    promptOpen: leaveOpen,
    requestClose,
    stay,
    leave,
    leaveNow,
  } = useLeaveGuard(composing && isCheckInDirty(form))

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

  const needsRevealAck = !editing && !queued && myCheckIns === 0
  const closeScreen = () => router.back()

  const onSubmit = async () => {
    if (saving.current || submitting) return
    const invalid = validateCheckIn(form)
    if (invalid) {
      setFeelingError(true)
      setSubmitError(invalid)
      return
    }
    if (needsRevealAck && !revealAcked.current) {
      setRevealOpen(true)
      return
    }
    setRevealOpen(false)
    setSubmitError(null)
    setFeelingError(false)
    saving.current = true
    setSubmitting(true)
    const prompt = {
      id: mine?.prompt_id ?? REFLECTION_PROMPT_ID,
      text: mine?.prompt_text ?? REFLECTION_PROMPT,
      answer: promptAnswerForSubmit(form),
    }
    const note = noteForSubmit(form)
    const result = editing
      ? await revise(form.score as number, note, form.activities, prompt)
      : await submit(form.score as number, note, form.activities, prompt)
    saving.current = false
    setSubmitting(false)
    if (result.error) {
      setSubmitError(result.error || SAVE_ERROR)
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
      setJustSaved(true)
      return
    }
    if (user?.id) await clearCheckInDraft(user.id, today)
    setEditing(false)
    setJustSaved(true)
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
      <View style={styles.bannerSlot}>
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
      </View>

      {composing ? (
        <CheckInComposer
          dateLabel={formatDisplayDate(today)}
          form={form}
          onChange={(next) => {
            setForm(next)
            if (feelingError && canSaveCheckIn(next)) {
              setFeelingError(false)
              setSubmitError(null)
            }
          }}
          onClose={requestClose}
          onSave={() => void onSubmit()}
          onSkip={() => {
            if (editing) {
              setEditing(false)
              setSubmitError(null)
              setFeelingError(false)
              return
            }
            leaveNow()
          }}
          skipLabel={editing ? KEEP_SAVED_LABEL : SKIP_LABEL}
          editing={editing}
          queued={queued}
          submitting={submitting}
          error={submitError}
          feelingError={feelingError}
        />
      ) : null}

      {justSaved && !editing ? (
        <CheckInSaved onDone={closeScreen} error={null} />
      ) : null}

      {mine && waitingForPartner && !editing && !justSaved ? (
        <ScrollView
          contentContainerStyle={styles.moment}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.momentHeader}>
            <IconButton name="x" accessibilityLabel="Close" onPress={closeScreen} />
          </View>
          <WaitingMoment
            mine={mine}
            partnerName={partner.display_name}
            userId={user?.id ?? ''}
            nudged={nudged}
            nudging={nudging}
            onNudge={() => void onNudge()}
            onRefresh={() => void refresh()}
            onEdit={beginEdit}
            onDone={closeScreen}
          />
        </ScrollView>
      ) : null}

      {bothSubmitted && mine && partnerCheckIn && user?.id && !justSaved ? (
        <ScrollView
          contentContainerStyle={styles.moment}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.momentHeader}>
            <IconButton name="x" accessibilityLabel="Close" onPress={closeScreen} />
          </View>
          <RevealMoment
            mine={mine}
            partner={partnerCheckIn}
            partnerName={partner.display_name}
          />
          <TextLink label="Done" onPress={closeScreen} />
        </ScrollView>
      ) : null}

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
      <ConfirmDialog
        visible={leaveOpen}
        title={DISCARD_TITLE}
        body={DISCARD_BODY}
        confirmLabel={DISCARD_CONFIRM}
        cancelLabel={DISCARD_STAY}
        onCancel={stay}
        onConfirm={leave}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  heading: {
    ...type.heading,
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
  bannerSlot: {
    paddingHorizontal: 20,
  },
  moment: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  momentHeader: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
})
