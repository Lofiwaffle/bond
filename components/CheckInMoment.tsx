import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import {
  ActivityChips,
  ErrorText,
  Field,
  PrimaryButton,
  ReadOnlyChips,
  ScoreMark,
  ScoreScale,
  TextLink,
} from './ui'
import type { ActivityId } from '../lib/activities'
import {
  loadPrivateThought,
  loadRevealAction,
  savePrivateThought,
  saveRevealAction,
  type SavedRevealAction,
} from '../lib/checkInDraft'
import {
  REVEAL_ACTIONS,
  displaySharedWords,
  revealReflection,
  type RevealActionId,
} from '../lib/checkInReveal'
import { SCORE_LABELS, colors, hairlineWidth, hit, radii, type } from '../lib/theme'
import type { DailyCheckIn } from '../types/database'

export function PrivacyLine() {
  return (
    <Text style={styles.privacy}>
      Private until you both check in. No one else sees this.
    </Text>
  )
}

export function CheckInProgress({
  step,
  total = 3,
}: {
  step: number
  total?: number
}) {
  return (
    <Text style={styles.progressLabel} accessibilityLabel={`Question ${step} of ${total}`}>
      {step} of {total}
    </Text>
  )
}

export function WaitingMoment({
  mine,
  partnerName,
  userId,
  nudged,
  nudging,
  onNudge,
  onRefresh,
  onDone,
}: {
  mine: DailyCheckIn
  partnerName: string
  userId: string
  nudged: boolean
  nudging: boolean
  onNudge: () => void
  onRefresh: () => void
  onDone?: () => void
}) {
  const [thought, setThought] = useState('')
  const [thoughtReady, setThoughtReady] = useState(false)

  useEffect(() => {
    void loadPrivateThought(userId, mine.check_in_date).then((value) => {
      setThought(value)
      setThoughtReady(true)
    })
  }, [mine.check_in_date, userId])

  useEffect(() => {
    if (!thoughtReady) return
    void savePrivateThought(userId, thought, mine.check_in_date)
  }, [mine.check_in_date, thought, thoughtReady, userId])

  return (
    <View>
      <Text style={styles.kicker}>Saved</Text>
      <Text style={styles.title}>It's with you until {partnerName} is ready.</Text>
      <Text style={styles.body}>
        Your entry is saved. They cannot see it yet. There is no rush.
      </Text>

      <View style={styles.pair}>
        <View style={styles.card}>
          <Text style={styles.cardName}>You</Text>
          <View style={styles.scoreLine}>
            <ScoreMark score={mine.score} size={28} />
            <Text style={styles.body}>{SCORE_LABELS[mine.score]}</Text>
          </View>
          <Text style={styles.shared}>{displaySharedWords(mine.prompt_answer)}</Text>
          <ReadOnlyChips ids={mine.activities ?? []} />
        </View>
        <View style={styles.sealed}>
          <Text style={styles.cardName}>{partnerName}</Text>
          <Text style={styles.sealedBody}>Hidden until they check in too.</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>A thought only you can see</Text>
      <Field
        value={thought}
        onChangeText={setThought}
        placeholder="Optional. Stays on this device."
        accessibilityLabel="Private thought"
        autoCapitalize="sentences"
        multiline
        maxLength={500}
        style={styles.note}
      />
      <Text style={styles.hint}>They will not see this, even after the day opens.</Text>

      {nudged ? (
        <Text style={styles.hint}>
          A gentle note is on its way. No follow-up from us.
        </Text>
      ) : (
        <TextLink
          label={nudging ? 'Sending…' : `Send ${partnerName} a gentle reminder`}
          onPress={onNudge}
          disabled={nudging}
        />
      )}
      <TextLink label="See if today is open" onPress={onRefresh} />
      {onDone ? <TextLink label="Done" onPress={onDone} /> : null}
    </View>
  )
}

export function RevealMoment({
  mine,
  partner,
  partnerName,
  userId,
}: {
  mine: DailyCheckIn
  partner: DailyCheckIn
  partnerName: string
  userId: string
}) {
  const insight = revealReflection(mine, partner, partnerName)
  const [actionId, setActionId] = useState<RevealActionId | null>(
    insight.suggestedAction,
  )
  const [actionText, setActionText] = useState('')
  const [saved, setSaved] = useState<SavedRevealAction | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void loadRevealAction(userId, mine.check_in_date).then((value) => {
      if (!value) return
      setSaved(value)
      setActionId(value.id)
      setActionText(value.text)
    })
  }, [mine.check_in_date, userId])

  const active = REVEAL_ACTIONS.find((item) => item.id === actionId) ?? null

  const onSaveAction = async () => {
    if (!actionId || saving) return
    const text = actionText.trim() || active?.prompt || ''
    setSaving(true)
    const next = { id: actionId, text }
    await saveRevealAction(userId, next, mine.check_in_date)
    setSaved(next)
    setSaving(false)
  }

  return (
    <View>
      <Text style={styles.kicker}>Today is open</Text>
      <Text style={styles.title}>You both showed up. Here is the day, side by side.</Text>

      <View style={styles.pair}>
        <View style={styles.card}>
          <Text style={styles.cardName}>You</Text>
          <View style={styles.scoreLine}>
            <ScoreMark score={mine.score} size={28} />
            <Text style={styles.body}>{SCORE_LABELS[mine.score]}</Text>
          </View>
          <Text style={styles.shared}>{displaySharedWords(mine.prompt_answer)}</Text>
          <ReadOnlyChips ids={mine.activities ?? []} />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardName}>{partnerName}</Text>
          <View style={styles.scoreLine}>
            <ScoreMark score={partner.score} size={28} />
            <Text style={styles.body}>{SCORE_LABELS[partner.score]}</Text>
          </View>
          <Text style={styles.shared}>
            {displaySharedWords(partner.prompt_answer)}
          </Text>
          <ReadOnlyChips ids={partner.activities ?? []} />
        </View>
      </View>

      <Text style={styles.insight}>{insight.commonGround}</Text>
      {insight.difference ? (
        <Text style={styles.body}>{insight.difference}</Text>
      ) : null}

      <Text style={styles.sectionLabel}>A way into the conversation</Text>
      <Text style={styles.starter}>{insight.starter}</Text>

      <Text style={styles.sectionLabel}>One small action</Text>
      <View style={styles.actionRow}>
        {REVEAL_ACTIONS.map((item) => {
          const selected = item.id === actionId
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              onPress={() => {
                setActionId(item.id)
                if (!actionText.trim()) setActionText('')
              }}
              style={[styles.actionChip, selected && styles.actionChipOn]}
            >
              <Text
                style={[styles.actionChipLabel, selected && styles.actionChipLabelOn]}
              >
                {item.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {active ? (
        <>
          <Field
            value={actionText}
            onChangeText={setActionText}
            placeholder={active.prompt}
            accessibilityLabel={active.prompt}
            autoCapitalize="sentences"
            multiline
            maxLength={280}
            style={styles.note}
          />
          <PrimaryButton
            label={saved ? 'Update this action' : 'Keep this for tonight'}
            onPress={() => void onSaveAction()}
            loading={saving}
          />
          {saved ? (
            <Text style={styles.hint}>Saved on this device. Say it when you are together.</Text>
          ) : null}
        </>
      ) : null}
    </View>
  )
}

export function ScoreStep({
  value,
  onChange,
}: {
  value: number | null
  onChange: (score: number) => void
}) {
  return (
    <View>
      <CheckInProgress step={1} />
      <Text style={styles.title}>How connected do you feel today?</Text>
      <ScoreScale value={value} onChange={onChange} />
      <PrivacyLine />
    </View>
  )
}

export function WordsStep({
  prompt,
  value,
  noWords,
  onChange,
  onNoWords,
}: {
  prompt: string
  value: string
  noWords: boolean
  onChange: (text: string) => void
  onNoWords: () => void
}) {
  return (
    <View>
      <CheckInProgress step={2} />
      <Text style={styles.title}>{prompt}</Text>
      {noWords ? (
        <Text style={styles.body}>{displaySharedWords(null)}</Text>
      ) : (
        <Field
          value={value}
          onChangeText={onChange}
          placeholder="A few sentences, if you have them"
          accessibilityLabel="Today's prompt answer"
          autoCapitalize="sentences"
          multiline
          maxLength={500}
          style={styles.note}
        />
      )}
      <TextLink
        label={noWords ? 'I want to write something' : "I don't have words today"}
        onPress={onNoWords}
      />
      <PrivacyLine />
    </View>
  )
}

export function ExtrasStep({
  value,
  onChange,
  error,
}: {
  value: ActivityId[]
  onChange: (next: ActivityId[]) => void
  error: string | null
}) {
  return (
    <View>
      <CheckInProgress step={3} />
      <Text style={styles.title}>What shaped today?</Text>
      <Text style={styles.body}>Optional. Skip if nothing fits.</Text>
      <ActivityChips value={value} onChange={onChange} />
      <PrivacyLine />
      <ErrorText message={error} />
    </View>
  )
}

const styles = StyleSheet.create({
  kicker: {
    ...type.label,
    marginBottom: 6,
  },
  title: {
    ...type.heading,
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 12,
  },
  body: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  privacy: {
    ...type.label,
    marginTop: 16,
    marginBottom: 0,
  },
  progressLabel: {
    ...type.label,
    marginBottom: 8,
  },
  pair: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    gap: 8,
    backgroundColor: colors.white,
  },
  sealed: {
    flex: 1,
    minHeight: 140,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    backgroundColor: colors.bgSoft,
    justifyContent: 'center',
    gap: 8,
  },
  sealedBody: {
    ...type.label,
    marginBottom: 0,
  },
  cardName: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shared: {
    ...type.body,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionLabel: {
    ...type.label,
    marginTop: 8,
    marginBottom: 8,
  },
  hint: {
    ...type.label,
    marginTop: 8,
    marginBottom: 4,
  },
  note: {
    minHeight: 88,
    textAlignVertical: 'top',
    marginBottom: 0,
  },
  insight: {
    ...type.body,
    fontWeight: '500',
    marginBottom: 8,
  },
  starter: {
    ...type.body,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  actionChip: {
    minHeight: hit,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
  },
  actionChipOn: {
    backgroundColor: colors.accentFill,
    borderColor: colors.accentFill,
  },
  actionChipLabel: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
  actionChipLabelOn: {
    color: colors.onAccent,
  },
})
