import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

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
  intentionAnswers,
  type WeeklyAnswer,
} from '../../lib/weeklyPrompts'

export default function WeeklyReviewScreen() {
  const { partner, profile, isLoading: authLoading } = useAuth()
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
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [editingSummary, setEditingSummary] = useState(false)
  const [summaryDraft, setSummaryDraft] = useState('')
  const [summaryBusy, setSummaryBusy] = useState(false)

  useEffect(() => {
    setAnswers(initialAnswers)
    setStep(0)
  }, [initialAnswers])

  if (authLoading || isLoading) return <LoadingScreen />
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

  const onChangeAnswer = (index: number, text: string) => {
    setAnswers((prev) => {
      const next = [...prev]
      const base = next[index] ?? initialAnswers[index]
      next[index] = { ...base, answer: text }
      return next
    })
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
    showToast('Summary updated')
  }

  const onDismiss = async () => {
    setSummaryBusy(true)
    const result = await dismissSummary()
    setSummaryBusy(false)
    if (result.error) showToast("Couldn't dismiss that summary.")
  }

  return (
    <Screen style={styles.screen} keyboard>
      <Text style={styles.title}>Weekly review</Text>
      <Text style={styles.subtitle}>
        {formatDisplayDate(weekStart)} – {formatDisplayDate(weekEnd)}
      </Text>

      {error ? (
        <StatusPanel
          message="Couldn't load this week's review."
          onRetry={() => void refresh()}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This week</Text>
          <Text style={styles.hint}>
            Participation, not a score. You checked in {myDays} day
            {myDays === 1 ? '' : 's'}. {openDays} day{openDays === 1 ? '' : 's'}{' '}
            opened for both of you.
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
              you both finish.
            </Text>
            <Field
              value={answers[step]?.answer ?? ''}
              onChangeText={(text) => onChangeAnswer(step, text)}
              placeholder="A few sentences"
              accessibilityLabel={current.text}
              autoCapitalize="sentences"
              multiline
              style={styles.answer}
            />
            <ErrorText message={submitError} />
            {step < prompts.length - 1 ? (
              <PrimaryButton
                label="Continue"
                onPress={() => setStep((n) => n + 1)}
                disabled={!answers[step]?.answer.trim()}
              />
            ) : (
              <PrimaryButton
                label="Save weekly review"
                onPress={() => void onSubmit()}
                loading={submitting}
                disabled={!answers[step]?.answer.trim()}
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
              They cannot see your answers yet. There is no rush.
            </Text>
            {mine.answers.map((a) => (
              <View key={a.prompt_id} style={styles.promptBlock}>
                <Text style={styles.promptText}>{a.prompt_text}</Text>
                <Text style={styles.answerText}>{a.answer}</Text>
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
                  <Text style={styles.answerText}>{a.answer}</Text>
                  <Text style={styles.metaLabel}>{partner.display_name}</Text>
                  <Text style={styles.answerText}>
                    {theirs?.answer ?? ''}
                  </Text>
                </View>
              )
            })}

            <View style={styles.intention}>
              <Text style={styles.metaLabel}>This week's intention</Text>
              {myIntention ? (
                <Text style={styles.answerText}>{myName}: {myIntention}</Text>
              ) : null}
              {theirIntention ? (
                <Text style={styles.answerText}>
                  {partner.display_name}: {theirIntention}
                </Text>
              ) : null}
              <Text style={styles.hint}>
                Say these out loud and keep one small thing you can actually do.
              </Text>
            </View>
          </View>
        ) : null}

        {bothSubmitted ? (
          <View style={styles.sectionLast}>
            <Text style={styles.sectionTitle}>Suggested reading</Text>
            <Text style={styles.hint}>
              Optional. Clearly not a diagnosis. Your answers above are the
              record.
            </Text>
            {aiSummary && !aiSummary.dismissed ? (
              <>
                <Text style={styles.metaLabel}>
                  {aiSummary.source === 'ai'
                    ? 'Generated suggestion'
                    : 'Local suggestion'}
                  {aiSummary.originalSummary &&
                  aiSummary.originalSummary !== aiSummary.summary
                    ? ' · edited'
                    : ''}
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
                    label="Save this reading"
                    onPress={() => void onSaveEdit()}
                    loading={summaryBusy}
                  />
                ) : (
                  <TextLink
                    label="Edit this reading"
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
                    The suggestion is hidden. Your original words stay.
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
