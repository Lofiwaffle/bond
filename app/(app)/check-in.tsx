import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'

import {
  ErrorText,
  Field,
  Label,
  LoadingScreen,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Subtitle,
  Title,
} from '../../components/ui'
import { useTodayCheckIn } from '../../hooks/useCheckIn'
import { useAuth } from '../../lib/auth'
import { DAILY_PROMPT, SCORE_LABELS, formatDisplayDate, localDateString } from '../../lib/dates'
import { syncCheckInReminder } from '../../lib/notifications'

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
  const [score, setScore] = useState<number | null>(null)
  const [note, setNote] = useState('')
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
        <Title>Daily check-in</Title>
        <Subtitle>
          Waiting for your partner to join before check-ins unlock.
        </Subtitle>
        <SecondaryButton label="Back" onPress={() => router.back()} />
      </Screen>
    )
  }

  const onSubmit = async () => {
    if (score == null) {
      setSubmitError('Pick a score from 1 to 5')
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
      <Title>Daily check-in</Title>
      <Subtitle>
        {DAILY_PROMPT} · {formatDisplayDate(localDateString())}
      </Subtitle>

      <ErrorText message={error} />

      {!mine ? (
        <>
          <Label>Your connection (1–5)</Label>
          <View style={styles.scoreRow}>
            {[1, 2, 3, 4, 5].map((value) => {
              const selected = score === value
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`Score ${value}, ${SCORE_LABELS[value]}`}
                  onPress={() => setScore(value)}
                  style={[styles.scoreChip, selected && styles.scoreChipSelected]}
                >
                  <Text
                    style={[
                      styles.scoreChipText,
                      selected && styles.scoreChipTextSelected,
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          {score != null ? (
            <Text style={styles.scoreHint}>{SCORE_LABELS[score]}</Text>
          ) : null}

          <Label>Optional note</Label>
          <Field
            value={note}
            onChangeText={setNote}
            placeholder="A short note for later…"
            autoCapitalize="sentences"
            multiline
            style={styles.note}
          />

          <ErrorText message={submitError} />
          <PrimaryButton
            label="Submit check-in"
            onPress={onSubmit}
            loading={submitting}
            disabled={score == null}
          />
        </>
      ) : null}

      {mine && waitingForPartner ? (
        <View style={styles.card}>
          <Text style={styles.metaLabel}>Your answer (hidden from partner)</Text>
          <Text style={styles.metaValue}>
            {mine.score} · {SCORE_LABELS[mine.score]}
          </Text>
          {mine.note ? <Text style={styles.noteText}>{mine.note}</Text> : null}
          <Text style={styles.waiting}>
            Waiting for {partner.display_name} to check in. Their answer stays
            hidden until you both submit.
          </Text>
        </View>
      ) : null}

      {bothSubmitted && mine && partnerCheckIn ? (
        <View style={styles.card}>
          <Text style={styles.revealTitle}>Both checked in</Text>
          <Text style={styles.metaLabel}>You</Text>
          <Text style={styles.metaValue}>
            {mine.score} · {SCORE_LABELS[mine.score]}
          </Text>
          {mine.note ? <Text style={styles.noteText}>{mine.note}</Text> : null}

          <Text style={styles.metaLabel}>{partner.display_name}</Text>
          <Text style={styles.metaValue}>
            {partnerCheckIn.score} · {SCORE_LABELS[partnerCheckIn.score]}
          </Text>
          {partnerCheckIn.note ? (
            <Text style={styles.noteText}>{partnerCheckIn.note}</Text>
          ) : null}
        </View>
      ) : null}

      <PrimaryButton label="Refresh" onPress={() => void refresh()} />
      <SecondaryButton
        label="History"
        onPress={() => router.push('/(app)/history')}
      />
      <SecondaryButton label="Home" onPress={() => router.replace('/(app)')} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  scoreRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  scoreChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D6D3D1',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scoreChipSelected: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  scoreChipText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1917',
  },
  scoreChipTextSelected: {
    color: '#FFFFFF',
  },
  scoreHint: {
    color: '#78716C',
    marginBottom: 16,
  },
  note: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D6D3D1',
    marginBottom: 16,
  },
  revealTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78716C',
    marginTop: 12,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1917',
  },
  noteText: {
    marginTop: 6,
    color: '#44403C',
    fontSize: 15,
    lineHeight: 21,
  },
  waiting: {
    marginTop: 16,
    color: '#78716C',
    lineHeight: 20,
  },
})
