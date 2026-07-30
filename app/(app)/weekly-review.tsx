import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import {
  Card,
  ErrorText,
  Field,
  Label,
  LoadingScreen,
  PrimaryButton,
  ScoreEmoji,
  Screen,
  SecondaryButton,
  Subtitle,
  Title,
} from '../../components/ui'
import { useWeeklyReview } from '../../hooks/useWeeklyReview'
import { useAuth } from '../../lib/auth'
import { formatDisplayDate } from '../../lib/dates'
import { colors, scoreColorsSoft } from '../../lib/theme'
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
    streak,
    isLoading,
    error,
    refresh,
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

  if (authLoading || isLoading) return <LoadingScreen />
  if (!partner) return <Redirect href="/(app)/pair" />
  if (!unlocked) {
    return (
      <Screen>
        <Title>Weekly review</Title>
        <Subtitle>
          Keep a 7-day check-in streak to unlock your weekly reflection (
          {streak}/7).
        </Subtitle>
        <SecondaryButton label="Back" onPress={() => router.back()} />
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
      <Title>Weekly review</Title>
      <Subtitle>
        {formatDisplayDate(weekStart)} – {formatDisplayDate(weekEnd)} · streak{' '}
        {streak}
      </Subtitle>

      <ErrorText message={error} />

      <ScrollView contentContainerStyle={styles.body}>
        <Card style={{ backgroundColor: scoreColorsSoft[4] }}>
          <Text style={styles.sectionTitle}>Your week at a glance</Text>
          <Text style={styles.summaryLine}>
            Avg connection:{' '}
            {mySummary.avg != null
              ? `${mySummary.avg.toFixed(1)} · ${mySummary.label}`
              : '—'}
          </Text>
          <View style={styles.faces}>
            {weekCheckIns.map((day) =>
              day.mine ? (
                <ScoreEmoji key={day.date} score={day.mine.score} size={28} />
              ) : (
                <Text key={day.date} style={styles.missing}>
                  ·
                </Text>
              ),
            )}
          </View>
          {bothSubmitted || waitingForPartner ? (
            <Text style={styles.summaryLine}>
              {partner.display_name}:{' '}
              {partnerSummary.avg != null
                ? `${partnerSummary.avg.toFixed(1)} · ${partnerSummary.label}`
                : waitingForPartner
                  ? 'Waiting for their review…'
                  : 'Hidden until you both finish'}
            </Text>
          ) : null}
        </Card>

        {needsReview ? (
          <Card>
            <Text style={styles.sectionTitle}>Check in with each other</Text>
            <Text style={styles.hint}>
              Answer privately — you’ll see {partner.display_name}’s answers
              after they submit too.
            </Text>
            {prompts.map((prompt, index) => (
              <View key={prompt.id} style={styles.promptBlock}>
                <Label>{`Prompt ${index + 1}`}</Label>
                <Text style={styles.promptText}>{prompt.text}</Text>
                <Field
                  value={answers[index]?.answer ?? ''}
                  onChangeText={(text) => onChangeAnswer(index, text)}
                  placeholder="Your answer…"
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
          </Card>
        ) : null}

        {mine && waitingForPartner ? (
          <Card>
            <Text style={styles.sectionTitle}>Saved — waiting on partner</Text>
            {mine.answers.map((a) => (
              <View key={a.prompt_id} style={styles.promptBlock}>
                <Text style={styles.promptText}>{a.prompt_text}</Text>
                <Text style={styles.answerText}>{a.answer}</Text>
              </View>
            ))}
            <Text style={styles.hint}>
              {partner.display_name}’s answers unlock when they finish this
              week’s review.
            </Text>
          </Card>
        ) : null}

        {bothSubmitted && mine && partnerReview ? (
          <Card>
            <Text style={styles.sectionTitle}>Revealed together ✨</Text>
            {mine.answers.map((a, index) => {
              const theirs = partnerReview.answers[index]
              return (
                <View key={a.prompt_id} style={styles.promptBlock}>
                  <Text style={styles.promptText}>{a.prompt_text}</Text>
                  <Text style={styles.metaLabel}>You</Text>
                  <Text style={styles.answerText}>{a.answer}</Text>
                  <Text style={styles.metaLabel}>{partner.display_name}</Text>
                  <Text style={styles.answerText}>
                    {theirs?.answer ?? '—'}
                  </Text>
                </View>
              )
            })}
          </Card>
        ) : null}
      </ScrollView>

      <SecondaryButton label="Refresh" onPress={() => void refresh()} />
      <SecondaryButton label="Done" onPress={() => router.back()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 8,
  },
  body: {
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 8,
  },
  summaryLine: {
    color: colors.ink,
    fontWeight: '600',
    marginBottom: 8,
  },
  faces: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  missing: {
    width: 28,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 22,
  },
  hint: {
    color: colors.muted,
    marginBottom: 12,
    lineHeight: 20,
  },
  promptBlock: {
    marginBottom: 14,
  },
  promptText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 8,
    lineHeight: 21,
  },
  answer: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  answerText: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 21,
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: 4,
  },
})
