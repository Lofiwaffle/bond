import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import { plusGate } from '../../components/PlusPreview'
import { useBondPlus } from '../../hooks/useBondPlus'

import {
  ErrorText,
  Field,
  LoadingScreen,
  PrimaryButton,
  Screen,
  StatusPanel,
  TextLink,
} from '../../components/ui'
import { useWeeklyReview } from '../../hooks/useWeeklyReview'
import { useAuth } from '../../lib/auth'
import { formatDisplayDate } from '../../lib/dates'
import { useToast } from '../../lib/toast'
import { colors, hairlineWidth, type } from '../../lib/theme'
import {
  displayWeeklyAnswer,
  intentionAnswers,
  NO_WORDS_THIS_WEEK,
  weeklyAnswerIsComplete,
  type WeeklyAnswer,
} from '../../lib/weeklyPrompts'
import {
  loadWeeklyReviewDraft,
  saveWeeklyReviewDraft,
} from '../../lib/weeklyReviewDraft'

function mergeDraft(
  prompts: { id: string; text: string }[],
  draft: { answers: WeeklyAnswer[]; step: number } | null,
): { answers: WeeklyAnswer[]; step: number } {
  const answers = prompts.map((prompt, index) => {
    const fromDraft =
      draft?.answers.find((item) => item.prompt_id === prompt.id) ??
      draft?.answers[index]
    return {
      prompt_id: prompt.id,
      prompt_text: prompt.text,
      answer: fromDraft?.answer ?? '',
      skipped: Boolean(fromDraft?.skipped),
    }
  })
  const maxStep = Math.max(0, prompts.length - 1)
  const step = Math.min(Math.max(draft?.step ?? 0, 0), maxStep)
  return { answers, step }
}

export default function WeeklyReviewScreen() {
  const { user, partner, profile, isLoading: authLoading } = useAuth()
  const plus = useBondPlus()
  const {
    unlocked,
    needsReview,
    weekStart,
    weekEnd,
    prompts,
    mine,
    partnerReview,
    bothSubmitted,
    waitingForPartner,
    weekCheckIns,
    daysConnected,
    aiSummary,
    aiLoading,
    aiError,
    generateAiSummary,
    saveEditedSummary,
    dismissSummary,
    restoreSummary,
    isLoading,
    error,
    refresh,
    submit,
  } = useWeeklyReview()
  const { showToast } = useToast()

  const initialAnswers = useMemo(
    () =>
      prompts.map((p) => ({
        prompt_id: p.id,
        prompt_text: p.text,
        answer: '',
      })),
    [prompts],
  )
  const [answers, setAnswers] = useState<WeeklyAnswer[]>([])
  const [step, setStep] = useState(0)
  const [draftReady, setDraftReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [editingSummary, setEditingSummary] = useState(false)
  const [summaryDraft, setSummaryDraft] = useState('')
  const [summaryBusy, setSummaryBusy] = useState(false)

  useEffect(() => {
    if (!user?.id || !weekStart) {
      setAnswers(initialAnswers)
      setStep(0)
      setDraftReady(true)
      return
    }
    if (mine) {
      setAnswers(initialAnswers)
      setStep(0)
      setDraftReady(true)
      return
    }
    let cancelled = false
    setDraftReady(false)
    void loadWeeklyReviewDraft(user.id, weekStart).then((draft) => {
      if (cancelled) return
      const next = mergeDraft(prompts, draft)
      setAnswers(next.answers.length ? next.answers : initialAnswers)
      setStep(next.step)
      setDraftReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [user?.id, weekStart, initialAnswers, mine, prompts])

  useEffect(() => {
    if (!draftReady || !user?.id || mine || !weekStart || !answers.length) return
    void saveWeeklyReviewDraft(user.id, { weekStart, step, answers })
  }, [answers, step, draftReady, user?.id, weekStart, mine])

  if (authLoading || isLoading || !draftReady) return <LoadingScreen />
  if (!partner) return <Redirect href="/(app)/setup" />
  if (!unlocked) {
    const remaining = Math.max(0, 7 - daysConnected)
    return (
      <Screen>
        <Text style={styles.title}>Weekly review</Text>
        <Text style={styles.subtitle}>
          This opens after seven days of honest reflection, even if they were
          not in a row. {remaining} more check-in{remaining === 1 ? '' : 's'} on
          Today.
        </Text>
        <TextLink label="Back" onPress={() => router.back()} />
      </Screen>
    )
  }

  const plusLock = plusGate('weekly_review', plus)
  if (plusLock) return plusLock

  const onChangeAnswer = (index: number, text: string) => {
    setAnswers((prev) => {
      const next = [...prev]
      const base = next[index] ?? initialAnswers[index]
      next[index] = {
        ...base,
        answer: text,
        skipped: false,
      }
      return next
    })
  }

  const onSkip = (index: number) => {
    setAnswers((prev) => {
      const next = [...prev]
      const base = next[index] ?? initialAnswers[index]
      next[index] = {
        ...base,
        answer: '',
        skipped: true,
      }
      return next
    })
    if (index < prompts.length - 1) setStep((n) => n + 1)
  }

  const onSubmit = async () => {
    if (submitting) return
    const payload =
      answers.length === prompts.length
        ? answers
        : prompts.map((p, i) => ({
            prompt_id: p.id,
            prompt_text: p.text,
            answer: answers[i]?.answer ?? '',
            skipped: Boolean(answers[i]?.skipped),
          }))
    setSubmitting(true)
    setSubmitError(null)
    const result = await submit(payload)
    setSubmitting(false)
    if (result.error) setSubmitError(result.error)
    else showToast('Saved. Private until they finish too.')
  }

  const myDays = weekCheckIns.filter((d) => d.mine).length
  const openDays = weekCheckIns.filter((d) => d.revealed).length
  const myName = profile?.display_name?.trim() || 'You'
  const current = prompts[step]
  const myIntention = mine ? intentionAnswers(mine.answers) : ''
  const theirIntention = partnerReview
    ? intentionAnswers(partnerReview.answers)
    : ''
  const canAdvance = weeklyAnswerIsComplete(answers[step])

  const onGenerate = async () => {
    setSummaryBusy(true)
    await generateAiSummary(true)
    setSummaryBusy(false)
    setEditingSummary(false)
  }

  const onSaveEdit = async () => {
    setSummaryBusy(true)
    const result = await saveEditedSummary(summaryDraft)
    setSummaryBusy(false)
    if (result.error) {
      showToast("Couldn't save that edit.")
      return
    }
    setEditingSummary(false)
    showToast('Saved for you. The original stays for both of you.')
  }

  const onDismiss = async () => {
    setSummaryBusy(true)
    const result = await dismissSummary()
    setSummaryBusy(false)
    if (result.error) showToast("Couldn't hide that summary.")
    else showToast('Hidden for you. Your partner can still see it.')
  }

  return (
    <Screen style={styles.screen} keyboard>
      <Text style={styles.title}>Weekly review</Text>
      <Text style={styles.subtitle}>
        Last week · {formatDisplayDate(weekStart)} – {formatDisplayDate(weekEnd)}
      </Text>

      {error ? (
        <StatusPanel
          message="Couldn't load last week's review."
          onRetry={() => void refresh()}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last week</Text>
          <Text style={styles.hint}>
            Sunday through Saturday that already ended. Participation, not a
            score. You checked in {myDays} day{myDays === 1 ? '' : 's'}.{' '}
            {openDays} day{openDays === 1 ? '' : 's'} opened for both of you.
          </Text>
        </View>

        {needsReview && current ? (
          <View style={styles.sectionLast}>
            <Text style={styles.kicker}>
              {step + 1} of {prompts.length}
            </Text>
            <Text style={styles.sectionTitle}>{current.text}</Text>
            <Text style={styles.hint}>
              Answer on your own. {partner.display_name} will not see this until
              you both finish. Closing this keeps your draft on this device; it
              is lost if you clear Bond’s storage. You can finish until next
              Sunday.
            </Text>
            <Field
              value={answers[step]?.skipped ? '' : answers[step]?.answer ?? ''}
              onChangeText={(text) => onChangeAnswer(step, text)}
              placeholder={
                answers[step]?.skipped ? NO_WORDS_THIS_WEEK : 'A few sentences'
              }
              accessibilityLabel={current.text}
              autoCapitalize="sentences"
              multiline
              style={styles.answer}
            />
            <ErrorText message={submitError} />
            <TextLink
              label={NO_WORDS_THIS_WEEK}
              onPress={() => onSkip(step)}
            />
            {step < prompts.length - 1 ? (
              <PrimaryButton
                label="Continue"
                onPress={() => setStep((n) => n + 1)}
                disabled={!canAdvance}
              />
            ) : (
              <PrimaryButton
                label="Save weekly review"
                onPress={() => void onSubmit()}
                loading={submitting}
                disabled={!canAdvance}
              />
            )}
            {step > 0 ? (
              <TextLink label="Back" onPress={() => setStep((n) => n - 1)} />
            ) : (
              <TextLink label="Not this week" onPress={() => router.back()} />
            )}
          </View>
        ) : null}

        {mine && waitingForPartner ? (
          <View style={styles.sectionLast}>
            <Text style={styles.sectionTitle}>
              Saved. Waiting on {partner.display_name}.
            </Text>
            <Text style={styles.hint}>
              They cannot see your answers yet. There is no rush. These answers
              cannot be changed.
            </Text>
            {mine.answers.map((a) => (
              <View key={a.prompt_id} style={styles.promptBlock}>
                <Text style={styles.promptText}>{a.prompt_text}</Text>
                <Text style={styles.answerText}>{displayWeeklyAnswer(a)}</Text>
              </View>
            ))}
            <TextLink label="Done" onPress={() => router.back()} />
          </View>
        ) : null}

        {bothSubmitted && mine && partnerReview ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your words, side by side</Text>
            {mine.answers.map((a, index) => {
              const theirs = partnerReview.answers[index]
              return (
                <View key={a.prompt_id} style={styles.promptBlock}>
                  <Text style={styles.promptText}>{a.prompt_text}</Text>
                  <Text style={styles.metaLabel}>{myName}</Text>
                  <Text style={styles.answerText}>{displayWeeklyAnswer(a)}</Text>
                  <Text style={styles.metaLabel}>{partner.display_name}</Text>
                  <Text style={styles.answerText}>
                    {displayWeeklyAnswer(theirs)}
                  </Text>
                </View>
              )
            })}

            <View style={styles.intention}>
              <Text style={styles.metaLabel}>Last week's intention</Text>
              {myIntention ? (
                <Text style={styles.answerText}>{myName}: {myIntention}</Text>
              ) : null}
              {theirIntention ? (
                <Text style={styles.answerText}>
                  {partner.display_name}: {theirIntention}
                </Text>
              ) : null}
              <Text style={styles.hint}>
                Keep one small thing you can actually do. Talking together is
                optional, and only if it feels safe.
              </Text>
            </View>
          </View>
        ) : null}

        {bothSubmitted ? (
          <View style={styles.sectionLast}>
            <Text style={styles.sectionTitle}>Suggested reading</Text>
            <Text style={styles.hint}>
              Optional. Clearly not a diagnosis. Your answers above are the
              record and cannot be rewritten. Hide or edit applies only to you.
            </Text>
            {aiSummary && !aiSummary.dismissed ? (
              <>
                <Text style={styles.metaLabel}>
                  {aiSummary.source === 'ai'
                    ? 'Generated suggestion'
                    : 'Local suggestion'}
                  {aiSummary.personallyEdited ? ' · edited for you' : ''}
                </Text>
                {editingSummary ? (
                  <Field
                    value={summaryDraft}
                    onChangeText={setSummaryDraft}
                    accessibilityLabel="Edit summary"
                    autoCapitalize="sentences"
                    multiline
                    style={styles.answer}
                  />
                ) : (
                  <Text style={styles.aiSummary}>{aiSummary.summary}</Text>
                )}
                <ErrorText message={aiError} />
                {editingSummary ? (
                  <PrimaryButton
                    label="Save this reading for you"
                    onPress={() => void onSaveEdit()}
                    loading={summaryBusy}
                  />
                ) : (
                  <TextLink
                    label="Edit this reading for you"
                    onPress={() => {
                      setSummaryDraft(aiSummary.summary)
                      setEditingSummary(true)
                    }}
                  />
                )}
                <TextLink
                  label="This doesn't sound like us"
                  onPress={() => void onDismiss()}
                  disabled={summaryBusy}
                />
                <TextLink
                  label="Generate again"
                  onPress={() => void onGenerate()}
                  disabled={aiLoading || summaryBusy}
                />
              </>
            ) : (
              <>
                {aiSummary?.dismissed ? (
                  <Text style={styles.hint}>
                    Hidden for you. Your original words stay, and your partner
                    can still see the suggestion.
                  </Text>
                ) : null}
                <PrimaryButton
                  label={
                    aiLoading || summaryBusy
                      ? 'Working…'
                      : aiSummary?.dismissed
                        ? 'Show a suggestion again'
                        : 'Generate a suggestion'
                  }
                  onPress={() => {
                    if (aiSummary?.dismissed) {
                      void restoreSummary()
                      return
                    }
                    void onGenerate()
                  }}
                  loading={aiLoading || summaryBusy}
                />
              </>
            )}
            <TextLink label="Done" onPress={() => router.back()} />
          </View>
        ) : null}

        {!needsReview && !mine ? (
          <TextLink label="Done" onPress={() => router.back()} />
        ) : null}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 8,
  },
  title: {
    ...type.heading,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginBottom: 8,
  },
  body: {
    paddingBottom: 16,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  sectionLast: {
    paddingVertical: 20,
  },
  sectionTitle: {
    ...type.heading,
    marginBottom: 8,
  },
  kicker: {
    ...type.label,
    marginBottom: 8,
  },
  hint: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  promptBlock: {
    marginBottom: 14,
  },
  promptText: {
    ...type.body,
    fontWeight: '500',
    marginBottom: 8,
  },
  answer: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  answerText: {
    ...type.body,
    marginBottom: 6,
  },
  aiSummary: {
    ...type.body,
    marginBottom: 12,
  },
  metaLabel: {
    ...type.label,
    marginTop: 4,
  },
  intention: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: hairlineWidth,
    borderTopColor: colors.hairline,
  },
})
