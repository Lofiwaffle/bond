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
import { loadPrivateThought, savePrivateThought } from '../lib/checkInDraft'
import {
  REVEAL_ACTIONS,
  displaySharedWords,
  revealReflection,
  type RevealActionId,
} from '../lib/checkInReveal'
import { useDailyAction } from '../hooks/useDailyAction'
import { useAuth } from '../lib/auth'
import { DEVICE_ONLY_THOUGHTS } from '../lib/privacy'
import { useToast } from '../lib/toast'
import { SCORE_LABELS, colors, hairlineWidth, hit, radii, type } from '../lib/theme'
import type { DailyAction, DailyCheckIn } from '../types/database'

export function PrivacyLine() {
  return (
    <Text style={styles.privacy}>
      Private until you both check in. Then only the two of you.{' '}
      {DEVICE_ONLY_THOUGHTS}
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
  onEdit,
  onDone,
}: {
  mine: DailyCheckIn
  partnerName: string
  userId: string
  nudged: boolean
  nudging: boolean
  onNudge: () => void
  onRefresh: () => void
  onEdit?: () => void
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
        Your entry is saved. They cannot see it yet. There is no rush. You can
        correct it until they check in.
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
        placeholder="Optional. This device only — lost if storage is cleared."
        accessibilityLabel="Private thought"
        autoCapitalize="sentences"
        multiline
        maxLength={500}
        style={styles.note}
      />
      <Text style={styles.hint}>
        They will not see this, even after the day opens. {DEVICE_ONLY_THOUGHTS}
      </Text>

      {onEdit ? (
        <TextLink label="Edit my check-in" onPress={onEdit} />
      ) : null}
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
}: {
  mine: DailyCheckIn
  partner: DailyCheckIn
  partnerName: string
}) {
  const insight = revealReflection(mine, partner, partnerName)
  const { actionForDate, propose, respond, complete } = useDailyAction()
  const { showToast } = useToast()
  const action = actionForDate(mine.check_in_date)
  const [actionId, setActionId] = useState<RevealActionId>(
    insight.suggestedAction,
  )
  const [actionText, setActionText] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const active = REVEAL_ACTIONS.find((item) => item.id === actionId) ?? null

  const onPropose = async () => {
    if (!active || saving) return
    const text = actionText.trim()
    if (!text) {
      setActionError('Write one small thing first')
      return
    }
    setSaving(true)
    setActionError(null)
    const result = await propose(actionId, text, mine.check_in_date)
    setSaving(false)
    if (result.error) {
      setActionError(result.error)
      return
    }
    showToast('Offered. They will not see your private thought.')
  }

  const onRespond = async (status: 'accepted' | 'skipped') => {
    if (!action || saving) return
    setSaving(true)
    setActionError(null)
    const result = await respond(action.id, status)
    setSaving(false)
    if (result.error) {
      setActionError(result.error)
      return
    }
    showToast(
      status === 'accepted'
        ? 'Accepted. It will stay on Today until you mark it done.'
        : 'Passed for tonight. No follow-up from Bond.',
    )
  }

  const onComplete = async () => {
    if (!action || saving) return
    setSaving(true)
    setActionError(null)
    const result = await complete(action.id)
    setSaving(false)
    if (result.error) {
      setActionError(result.error)
      return
    }
    showToast('Saved as a moment you shared.')
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

      <Text style={styles.sectionLabel}>If talking together feels safe</Text>
      <Text style={styles.starter}>{insight.starter}</Text>
      <Text style={styles.body}>
        Skip this if a conversation would not be safe. Bond will not tell you
        that you have to talk it through.
      </Text>

      <OneSmallAction
        partnerName={partnerName}
        action={action}
        actionId={actionId}
        actionText={actionText}
        active={active}
        saving={saving}
        error={actionError}
        onSelectKind={setActionId}
        onChangeText={setActionText}
        onPropose={() => void onPropose()}
        onAccept={() => void onRespond('accepted')}
        onSkip={() => void onRespond('skipped')}
        onComplete={() => void onComplete()}
      />
    </View>
  )
}

function OneSmallAction({
  partnerName,
  action,
  actionId,
  actionText,
  active,
  saving,
  error,
  onSelectKind,
  onChangeText,
  onPropose,
  onAccept,
  onSkip,
  onComplete,
}: {
  partnerName: string
  action: DailyAction | null
  actionId: RevealActionId
  actionText: string
  active: { id: RevealActionId; label: string; prompt: string } | null
  saving: boolean
  error: string | null
  onSelectKind: (id: RevealActionId) => void
  onChangeText: (text: string) => void
  onPropose: () => void
  onAccept: () => void
  onSkip: () => void
  onComplete: () => void
}) {
  const kindLabel =
    REVEAL_ACTIONS.find((item) => item.id === action?.kind)?.label ?? 'Action'

  return (
    <View>
      <Text style={styles.sectionLabel}>One small action</Text>
      {!action ? (
        <>
          <Text style={styles.body}>
            Offer one thing. {partnerName} can accept or pass. Your private
            thought stays on this device and is lost if you clear Bond’s
            storage.
          </Text>
          <View style={styles.actionRow}>
            {REVEAL_ACTIONS.map((item) => {
              const selected = item.id === actionId
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={item.label}
                  onPress={() => onSelectKind(item.id)}
                  style={[styles.actionChip, selected && styles.actionChipOn]}
                >
                  <Text
                    style={[
                      styles.actionChipLabel,
                      selected && styles.actionChipLabelOn,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          {active ? (
            <Field
              value={actionText}
              onChangeText={onChangeText}
              placeholder={active.prompt}
              accessibilityLabel={active.prompt}
              autoCapitalize="sentences"
              multiline
              maxLength={280}
              style={styles.note}
            />
          ) : null}
          <PrimaryButton
            label="Offer this"
            onPress={onPropose}
            loading={saving}
          />
        </>
      ) : null}

      {action?.status === 'proposed' ? (
        <ProposedAction
          action={action}
          partnerName={partnerName}
          saving={saving}
          onAccept={onAccept}
          onSkip={onSkip}
        />
      ) : null}

      {action?.status === 'accepted' ? (
        <>
          <Text style={styles.body}>
            {kindLabel}: {action.text}
          </Text>
          <Text style={styles.hint}>
            This stays on Today until one of you marks it done.
          </Text>
          <PrimaryButton
            label="We did it"
            onPress={onComplete}
            loading={saving}
          />
        </>
      ) : null}

      {action?.status === 'skipped' ? (
        <Text style={styles.hint}>
          Passed for tonight. Bond will not follow up.
        </Text>
      ) : null}

      {action?.status === 'completed' ? (
        <Text style={styles.hint}>
          You marked this done. It is a moment you shared.
        </Text>
      ) : null}

      <ErrorText message={error} />
    </View>
  )
}

function ProposedAction({
  action,
  partnerName,
  saving,
  onAccept,
  onSkip,
}: {
  action: DailyAction
  partnerName: string
  saving: boolean
  onAccept: () => void
  onSkip: () => void
}) {
  const { user } = useAuth()
  const kindLabel =
    REVEAL_ACTIONS.find((item) => item.id === action.kind)?.label ?? 'Action'

  if (action.proposed_by === user?.id) {
    return (
      <Text style={styles.hint}>
        Offered to {partnerName}. Waiting. They will not see your private
        thought.
      </Text>
    )
  }

  return (
    <>
      <Text style={styles.body}>
        {partnerName} offered: {kindLabel.toLowerCase()}. {action.text}
      </Text>
      <PrimaryButton
        label="Yes, tonight"
        onPress={onAccept}
        loading={saving}
      />
      <TextLink
        label="Not tonight"
        onPress={onSkip}
        disabled={saving}
      />
    </>
  )
}

export function SharedActionCard({
  action,
  partnerName,
  userId,
}: {
  action: DailyAction
  partnerName: string
  userId: string
}) {
  const { complete } = useDailyAction()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const kindLabel =
    REVEAL_ACTIONS.find((item) => item.id === action.kind)?.label ?? 'Action'
  const fromMe = action.proposed_by === userId

  const onComplete = async () => {
    if (saving) return
    setSaving(true)
    const result = await complete(action.id)
    setSaving(false)
    if (result.error) {
      showToast(result.error)
      return
    }
    showToast('Saved as a moment you shared.')
  }

  return (
    <View style={styles.sharedCard}>
      <Text style={styles.kicker}>Tonight</Text>
      <Text style={styles.title}>One small action</Text>
      <Text style={styles.body}>
        {fromMe ? `You offered` : `${partnerName} offered`}: {kindLabel.toLowerCase()}.{' '}
        {action.text}
      </Text>
      <PrimaryButton
        label="We did it"
        onPress={() => void onComplete()}
        loading={saving}
      />
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
  sharedCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
})
