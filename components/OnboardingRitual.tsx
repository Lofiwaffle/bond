import { Pressable, StyleSheet, Text, View } from 'react-native'

import { FaceIcon, Icon, type IconName } from '../lib/icons'
import { useAccessibleLayout } from '../lib/a11y'
import {
  SCORE_LABELS,
  colors,
  hairlineWidth,
  hit,
  radii,
  type,
} from '../lib/theme'

export const SAMPLE_PROMPT = 'How connected did you feel today?'
export const SAMPLE_YOURS =
  'Dinner felt easy. I missed you in the afternoon.'
export const SAMPLE_THEIRS =
  'Work ran late. I felt far from you tonight.'
export const SAMPLE_ACTION = 'Eat together tomorrow. Phones away.'
export const SAMPLE_PARTNER = 'Sam'
export const SAMPLE_PARTNER_SCORE = 2

export function PromiseVisual() {
  return (
    <View style={styles.promise} accessibilityLabel="A two-minute daily ritual">
      <View style={styles.promisePair}>
        <FaceIcon score={4} size={52} />
        <View style={styles.promiseLock}>
          <Icon name="clock" size={16} color={colors.ink} />
        </View>
        <FaceIcon score={2} size={52} />
      </View>
      <Text style={styles.promiseCaption}>Two minutes. Before the day hardens.</Text>
    </View>
  )
}

export function CompactScorePicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (score: number) => void
}) {
  const { compactVisual, highContrast } = useAccessibleLayout()
  return (
    <View>
      <View style={styles.scaleRow}>
        {[1, 2, 3, 4, 5].map((score) => {
          const selected = value === score
          return (
            <Pressable
              key={score}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={SCORE_LABELS[score]}
              onPress={() => onChange(score)}
              style={(state) => [
                styles.scaleCell,
                selected && styles.scaleCellSelected,
                highContrast && { borderColor: colors.ink },
                state.pressed && { opacity: 0.75 },
              ]}
            >
              <FaceIcon score={score} size={compactVisual} />
            </Pressable>
          )
        })}
      </View>
      <View style={styles.scaleCaptions}>
        <Text style={[styles.caption, styles.captionStart]}>
          {SCORE_LABELS[1]}
        </Text>
        <Text style={[styles.caption, styles.captionEnd]}>
          {SCORE_LABELS[5]}
        </Text>
      </View>
      <Text style={styles.hint}>
        {value == null
          ? 'Tap how today felt. This stays only yours.'
          : `Saved as ${SCORE_LABELS[value]}. Still private.`}
      </Text>
      {value != null ? (
        <View style={styles.privateNote}>
          <Text style={styles.privateKicker}>Your private note</Text>
          <Text style={styles.entryNote}>{SAMPLE_YOURS}</Text>
        </View>
      ) : null}
    </View>
  )
}

export function RevealPreview({
  yours,
  revealed,
  onReveal,
  stacked = false,
}: {
  yours: number
  revealed: boolean
  onReveal: () => void
  stacked?: boolean
}) {
  return (
    <View
      testID="onboarding-reveal"
      style={[styles.revealRow, stacked && styles.revealStack]}
    >
      <EntryPreview
        name="You"
        score={yours}
        note={SAMPLE_YOURS}
      />
      {revealed ? (
        <EntryPreview
          name={SAMPLE_PARTNER}
          score={SAMPLE_PARTNER_SCORE}
          note={SAMPLE_THEIRS}
        />
      ) : (
        <Pressable
          testID="onboarding-sealed"
          accessibilityRole="button"
          accessibilityLabel="Show when they respond"
          onPress={onReveal}
          style={(state) => [
            styles.sealed,
            state.pressed && { opacity: 0.85 },
          ]}
        >
          <Icon name="eye-off" size={22} color={colors.muted} />
          <Text style={styles.sealedTitle}>Hidden</Text>
          <Text style={styles.sealedBody}>
            Their side opens when they check in too. Tap to see it.
          </Text>
        </Pressable>
      )}
    </View>
  )
}

export function ActionPreview() {
  return (
    <View style={styles.action}>
      <Text style={styles.actionKicker}>Tonight, together</Text>
      <Text style={styles.actionTitle}>{SAMPLE_ACTION}</Text>
      <Text style={styles.actionBody}>
        Not a plan for the year. One small thing that answers what you both
        just saw.
      </Text>
    </View>
  )
}

export function ExpectationRow({
  icon,
  title,
  body,
}: {
  icon: Extract<IconName, 'clock' | 'eye-off' | 'bell' | 'users' | 'smartphone'>
  title: string
  body: string
}) {
  return (
    <View style={styles.expectRow}>
      <View style={styles.expectIcon}>
        <Icon name={icon} size={18} color={colors.ink} />
      </View>
      <View style={styles.expectCopy}>
        <Text style={styles.expectTitle}>{title}</Text>
        <Text style={styles.expectBody}>{body}</Text>
      </View>
    </View>
  )
}

function EntryPreview({
  name,
  score,
  note,
}: {
  name: string
  score: number
  note: string
}) {
  return (
    <View style={styles.entry} accessibilityLabel={`${name}: ${SCORE_LABELS[score]}. ${note}`}>
      <View style={styles.entryHead}>
        <FaceIcon score={score} size={28} />
        <View style={{ flex: 1 }}>
          <Text style={styles.entryName}>{name}</Text>
          <Text style={styles.entryScore}>{SCORE_LABELS[score]}</Text>
        </View>
      </View>
      <Text style={styles.entryNote}>{note}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  promise: {
    alignItems: 'center',
    gap: 12,
  },
  promisePair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  promiseLock: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  promiseCaption: {
    ...type.label,
    marginBottom: 0,
    textAlign: 'center',
  },
  scaleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  scaleCell: {
    flex: 1,
    minHeight: hit,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scaleCellSelected: {
    borderColor: colors.accent,
  },
  scaleCaptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
  },
  caption: {
    ...type.label,
    marginBottom: 0,
    flexShrink: 1,
  },
  captionStart: {
    textAlign: 'left',
  },
  captionEnd: {
    textAlign: 'right',
  },
  hint: {
    ...type.label,
    marginTop: 8,
    marginBottom: 0,
    textAlign: 'center',
  },
  privateNote: {
    marginTop: 12,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    backgroundColor: colors.white,
    gap: 6,
  },
  privateKicker: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
  revealRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  revealStack: {
    flexDirection: 'column',
  },
  entry: {
    flex: 1,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    gap: 8,
    backgroundColor: colors.white,
  },
  entryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryName: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
  entryScore: {
    ...type.label,
    marginBottom: 0,
  },
  entryNote: {
    ...type.body,
    fontSize: 13,
    lineHeight: 18,
  },
  sealed: {
    flex: 1,
    minHeight: 148,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.bgSoft,
  },
  sealedTitle: {
    ...type.body,
    fontWeight: '500',
  },
  sealedBody: {
    ...type.label,
    textAlign: 'center',
    marginBottom: 0,
  },
  action: {
    borderWidth: hairlineWidth,
    borderColor: colors.accentFill,
    borderRadius: radii.md,
    padding: 16,
    backgroundColor: colors.accentSoft,
    gap: 6,
  },
  actionKicker: {
    ...type.label,
    color: colors.accentFill,
    marginBottom: 0,
  },
  actionTitle: {
    ...type.body,
    fontWeight: '500',
  },
  actionBody: {
    ...type.label,
    marginBottom: 0,
  },
  expectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: hit,
    paddingVertical: 8,
  },
  expectIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expectCopy: {
    flex: 1,
  },
  expectTitle: {
    ...type.body,
    fontWeight: '500',
  },
  expectBody: {
    ...type.label,
    marginTop: 2,
    marginBottom: 0,
  },
})
