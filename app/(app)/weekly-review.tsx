import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import {
  ErrorText,
  Field,
  Label,
  LoadingScreen,
  PrimaryButton,
  ScoreMark,
  Screen,
  TextLink,
} from '../../components/ui'
import { useWeeklyReview } from '../../hooks/useWeeklyReview'
import { useAuth } from '../../lib/auth'
import { formatDisplayDate } from '../../lib/dates'
import { colors, hairlineWidth, type } from '../../lib/theme'
import type { WeeklyAnswer } from '../../lib/weeklyPrompts'

export default function WeeklyReviewScreen() {
  const { partner, isLoading: authLoading } = useAuth()
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
    mySummary,
    partnerSummary,
    weekCheckIns,
    aiSummary,
    aiLoading,
    aiError,
    generateAiSummary,
    streak,
    isLoading,
    error,
    submit,
  } = useWeeklyReview()

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
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setAnswers(initialAnswers)
  }, [initialAnswers])

  useEffect(() => {
    if (!unlocked || aiSummary || aiLoading) return
    if (weekCheckIns.every((d) => !d.mine && !d.partner)) return
    void generateAiSummary(false)
  }, [aiLoading, aiSummary, generateAiSummary, unlocked, weekCheckIns])

  const refreshedAfterBoth = useRef(false)
  useEffect(() => {
    if (!bothSubmitted || refreshedAfterBoth.current) return
    refreshedAfterBoth.current = true
    void generateAiSummary(true)
  }, [bothSubmitted, generateAiSummary])

  if (authLoading || isLoading) return <LoadingScreen />
  if (!partner) return <Redirect href="/(app)/pair" />
  if (!unlocked) {
    return (
      <Screen>
        <Text style={styles.title}>Weekly review</Text>
        <Text style={styles.subtitle}>
          Keep a 7-day check-in streak to unlock your weekly reflection (
          {streak}/7).
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
  }

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Weekly review</Text>
      <Text style={styles.subtitle}>
        {formatDisplayDate(weekStart)} – {formatDisplayDate(weekEnd)} · streak{' '}
        {streak}
      </Text>

      <ErrorText message={error} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your week at a glance</Text>
          <Text style={styles.summaryLine}>
            Avg connection:{' '}
            {mySummary.avg != null
              ? `${mySummary.avg.toFixed(1)} · ${mySummary.label}`
              : 'None'}
          </Text>
          <View style={styles.faces}>
            {weekCheckIns.map((day) =>
              day.mine ? (
                <ScoreMark key={day.date} score={day.mine.score} size={24} />
              ) : (
                <View key={day.date} style={styles.missing} />
              ),
            )}
          </View>
          {bothSubmitted || waitingForPartner ? (
            <Text style={styles.summaryLine}>
              {partner.display_name}:{' '}
              {partnerSummary.avg != null
                ? `${partnerSummary.avg.toFixed(1)} · ${partnerSummary.label}`
                : waitingForPartner
                  ? 'Waiting for their review'
                  : 'Hidden until you both finish'}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Week summary</Text>
          <Text style={styles.hint}>
            A Bond summary of every daily check-in this week
            {aiSummary?.source === 'ai' ? ' (AI)' : aiSummary ? ' (local)' : ''}.
          </Text>
          {aiLoading && !aiSummary ? (
            <Text style={styles.hint}>Generating summary…</Text>
          ) : null}
          {aiSummary ? (
            <Text style={styles.aiSummary}>{aiSummary.summary}</Text>
          ) : (
            <Text style={styles.hint}>
              Check in during the week to unlock a narrative of your days
              together.
            </Text>
          )}
          <ErrorText message={aiError} />
          <TextLink
            label={aiSummary ? 'Regenerate summary' : 'Generate summary'}
            onPress={() => void generateAiSummary(true)}
            disabled={aiLoading}
          />
        </View>

        {needsReview ? (
          <View style={styles.sectionLast}>
            <Text style={styles.sectionTitle}>Check in with each other</Text>
            <Text style={styles.hint}>
              Answer privately. You'll see {partner.display_name}'s answers
              after they submit too.
            </Text>
            {prompts.map((prompt, index) => (
              <View key={prompt.id} style={styles.promptBlock}>
                <Label>{`Prompt ${index + 1}`}</Label>
                <Text style={styles.promptText}>{prompt.text}</Text>
                <Field
                  value={answers[index]?.answer ?? ''}
                  onChangeText={(text) => onChangeAnswer(index, text)}
                  placeholder="Your answer"
                  autoCapitalize="sentences"
                  multiline
                  style={styles.answer}
                />
              </View>
            ))}
            <ErrorText message={submitError} />
            <PrimaryButton
              label="Save weekly review"
              onPress={onSubmit}
              loading={submitting}
            />
            <TextLink label="Done" onPress={() => router.back()} />
          </View>
        ) : null}

        {mine && waitingForPartner ? (
          <View style={styles.sectionLast}>
            <Text style={styles.sectionTitle}>Saved. Waiting on partner</Text>
            {mine.answers.map((a) => (
              <View key={a.prompt_id} style={styles.promptBlock}>
                <Text style={styles.promptText}>{a.prompt_text}</Text>
                <Text style={styles.answerText}>{a.answer}</Text>
              </View>
            ))}
            <Text style={styles.hint}>
              {partner.display_name}'s answers unlock when they finish this
              week's review.
            </Text>
            <TextLink label="Done" onPress={() => router.back()} />
          </View>
        ) : null}

        {bothSubmitted && mine && partnerReview ? (
          <View style={styles.sectionLast}>
            <Text style={styles.sectionTitle}>Revealed together</Text>
            {mine.answers.map((a, index) => {
              const theirs = partnerReview.answers[index]
              return (
                <View key={a.prompt_id} style={styles.promptBlock}>
                  <Text style={styles.promptText}>{a.prompt_text}</Text>
                  <Text style={styles.metaLabel}>You</Text>
                  <Text style={styles.answerText}>{a.answer}</Text>
                  <Text style={styles.metaLabel}>{partner.display_name}</Text>
                  <Text style={styles.answerText}>
                    {theirs?.answer ?? 'None'}
                  </Text>
                </View>
              )
            })}
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
  summaryLine: {
    ...type.body,
    marginBottom: 8,
  },
  faces: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  missing: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.border,
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
    marginBottom: 8,
  },
  answer: {
    minHeight: 72,
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
})
