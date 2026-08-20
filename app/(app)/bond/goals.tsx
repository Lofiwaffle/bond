import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import {
  ErrorText,
  Field,
  Label,
  LoadingScreen,
  PrimaryButton,
  Screen,
  TextLink,
} from '../../../components/ui'
import { useCoupleGoal } from '../../../hooks/useCoupleGoal'
import { useAuth } from '../../../lib/auth'
import { formatDisplayDate, localDateString } from '../../../lib/dates'
import {
  loadCalendarMarks,
  openGoogleCalendarDeadline,
} from '../../../lib/googleCalendar'
import { Icon } from '../../../lib/icons'
import {
  DEADLINE_PRESETS,
  deadlineFromPreset,
  type SmartGoalDraft,
} from '../../../lib/smartGoal'
import { colors, hairlineWidth, radii, type } from '../../../lib/theme'
import type { CoupleGoal, CoupleGoalReview } from '../../../types/database'

const EMPTY_DRAFT: SmartGoalDraft = {
  outcome: '',
  successCriteria: '',
  realisticPlan: '',
  why: '',
  deadline: '',
}

function shortDate(iso: string): string {
  const day = iso.includes('T')
    ? localDateString(new Date(iso))
    : iso.slice(0, 10)
  return formatDisplayDate(day)
}

function isOverdue(
  deadline: string | null,
  status: CoupleGoal['status'],
): boolean {
  if (!deadline || status !== 'active') return false
  return deadline < localDateString()
}

function deadlineLabel(goal: CoupleGoal): string {
  if (!goal.deadline) return 'No deadline yet'
  if (goal.status === 'completed') {
    return `Was due ${shortDate(goal.deadline)}`
  }
  return `${isOverdue(goal.deadline, goal.status) ? 'Past due · ' : 'Due '}${shortDate(goal.deadline)}`
}

export default function BondGoalsScreen() {
  const { user, partner, isLoading: authLoading } = useAuth()
  const {
    activeGoals,
    completed,
    reviewsFor,
    isLoading,
    error,
    setGoal,
    addReview,
    completeGoal,
  } = useCoupleGoal()

  const [draft, setDraft] = useState<SmartGoalDraft>(EMPTY_DRAFT)
  const [review, setReview] = useState('')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addToCalendar, setAddToCalendar] = useState(true)
  const [calendarMarks, setCalendarMarks] = useState<Record<string, true>>({})
  const showForm = composing || (activeGoals.length === 0 && completed.length === 0)

  const partnerName = partner?.display_name ?? 'your partner'
  const selected =
    activeGoals.find((goal) => goal.id === selectedId) ??
    completed.find((goal) => goal.id === selectedId) ??
    null
  const selectedReviews = selected ? reviewsFor(selected.id) : []

  const reviewerName = useMemo(() => {
    return (userId: string) => {
      if (userId === user?.id) return 'You'
      return partner?.display_name ?? 'Partner'
    }
  }, [partner?.display_name, user?.id])

  useEffect(() => {
    void loadCalendarMarks().then(setCalendarMarks)
  }, [])

  if (authLoading || isLoading) return <LoadingScreen />

  const updateDraft = (key: keyof SmartGoalDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const onSetGoal = async () => {
    setFormError(null)
    setSaving(true)
    const result = await setGoal(draft)
    setSaving(false)
    if (result.error || !result.goal) {
      setFormError(result.error ?? 'Could not save this goal.')
      return
    }

    const created = result.goal
    if (addToCalendar && created.deadline) {
      const calendar = await openGoogleCalendarDeadline({
        id: created.id,
        outcome: created.outcome,
        successCriteria: created.success_criteria,
        realisticPlan: created.realistic_plan,
        why: created.why,
        deadline: created.deadline,
      })
      if (calendar.error) {
        setFormError(calendar.error)
      } else {
        setCalendarMarks((prev) => ({ ...prev, [created.id]: true }))
      }
    }

    setDraft(EMPTY_DRAFT)
    setAddToCalendar(true)
    setComposing(false)
    setSelectedId(created.id)
  }

  const onAddReview = async () => {
    if (!selected) return
    setFormError(null)
    setSaving(true)
    const result = await addReview(selected.id, review)
    setSaving(false)
    if (result.error) {
      setFormError(result.error)
      return
    }
    setReview('')
  }

  const onComplete = async () => {
    if (!selected) return
    setFormError(null)
    setCompleting(true)
    const result = await completeGoal(selected.id)
    setCompleting(false)
    if (result.error) {
      setFormError(result.error)
      return
    }
    setReview('')
  }

  const onAddToCalendar = async (goal: CoupleGoal) => {
    if (!goal.deadline) {
      setFormError('Set a deadline before adding this to Google Calendar.')
      return
    }
    setFormError(null)
    const result = await openGoogleCalendarDeadline({
      id: goal.id,
      outcome: goal.outcome,
      successCriteria: goal.success_criteria,
      realisticPlan: goal.realistic_plan,
      why: goal.why,
      deadline: goal.deadline,
    })
    if (result.error) {
      setFormError(result.error)
      return
    }
    setCalendarMarks((prev) => ({ ...prev, [goal.id]: true }))
  }

  const canSaveDraft =
    draft.outcome.trim().length >= 8 &&
    draft.successCriteria.trim().length >= 8 &&
    draft.realisticPlan.trim().length >= 8 &&
    draft.why.trim().length >= 8 &&
    draft.deadline.trim().length === 10

  const hasGoals = activeGoals.length > 0 || completed.length > 0

  return (
    <Screen style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <BondSectionHeader
          title="Goals"
          subtitle={`Keep more than one SMART goal going${
            partner ? ` with ${partnerName}` : ''
          }. Deadlines can go straight to Google Calendar.`}
        />

        <ErrorText message={error} />
        <ErrorText message={formError} />

        {hasGoals && !showForm ? (
          <View style={styles.addRow}>
            <TextLink
              label="Add another goal"
              onPress={() => {
                setFormError(null)
                setComposing(true)
                setSelectedId(null)
              }}
            />
          </View>
        ) : null}

        {showForm ? (
          <View style={styles.section}>
            <Text style={styles.emptyTitle}>
              {hasGoals ? 'Add a SMART goal' : 'Set a SMART goal'}
            </Text>
            <Text style={styles.emptyBody}>
              Name a well-defined outcome. Make it measurable, realistic, tied
              to what you value, and give it a deadline.
            </Text>

            <Label>S · Specific outcome</Label>
            <Text style={styles.fieldHint}>
              Identify a single, well-defined result you can both picture.
            </Text>
            <Field
              value={draft.outcome}
              onChangeText={(value) => updateDraft('outcome', value)}
              placeholder="Book a weekend trip just for us"
              autoCapitalize="sentences"
              maxLength={140}
            />

            <Label>M · Success criteria</Label>
            <Text style={styles.fieldHint}>
              How will you know you've succeeded? Make it observable.
            </Text>
            <Field
              value={draft.successCriteria}
              onChangeText={(value) => updateDraft('successCriteria', value)}
              placeholder="Dates booked, paid, and on the calendar"
              autoCapitalize="sentences"
              multiline
              style={styles.shortArea}
              maxLength={200}
            />

            <Label>A · Achievable</Label>
            <Text style={styles.fieldHint}>
              Confirm this is realistic with the time, money, and energy you
              have.
            </Text>
            <Field
              value={draft.realisticPlan}
              onChangeText={(value) => updateDraft('realisticPlan', value)}
              placeholder="Two evenings to research and a set budget"
              autoCapitalize="sentences"
              multiline
              style={styles.shortArea}
              maxLength={200}
            />

            <Label>R · Relevant</Label>
            <Text style={styles.fieldHint}>
              Which shared value or bigger aim does this serve?
            </Text>
            <Field
              value={draft.why}
              onChangeText={(value) => updateDraft('why', value)}
              placeholder="More unhurried time together this season"
              autoCapitalize="sentences"
              multiline
              style={styles.shortArea}
              maxLength={200}
            />

            <Label>T · Deadline</Label>
            <Text style={styles.fieldHint}>
              Set a specific date or pick a timeframe.
            </Text>
            <View style={styles.presetRow}>
              {DEADLINE_PRESETS.map((preset) => {
                const value = deadlineFromPreset(preset.days)
                const isSelected = draft.deadline === value
                return (
                  <Pressable
                    key={preset.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => updateDraft('deadline', value)}
                    style={[
                      styles.presetChip,
                      isSelected && styles.presetChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetLabel,
                        isSelected && styles.presetLabelSelected,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <Field
              value={draft.deadline}
              onChangeText={(value) => updateDraft('deadline', value)}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: addToCalendar }}
              onPress={() => setAddToCalendar((prev) => !prev)}
              style={styles.calendarToggle}
            >
              <View
                style={[
                  styles.checkbox,
                  addToCalendar && styles.checkboxChecked,
                ]}
              >
                {addToCalendar ? (
                  <Icon name="check" size={12} color={colors.onAccent} />
                ) : null}
              </View>
              <Text style={styles.calendarToggleLabel}>
                Add this deadline to Google Calendar
              </Text>
            </Pressable>

            <PrimaryButton
              label="Save this SMART goal"
              onPress={() => void onSetGoal()}
              loading={saving}
              disabled={!canSaveDraft}
            />
            {hasGoals ? (
              <TextLink
                label="Cancel"
                onPress={() => {
                  setComposing(false)
                  setFormError(null)
                }}
              />
            ) : null}
          </View>
        ) : null}

        {activeGoals.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your goals</Text>
            <Text style={styles.sectionHint}>
              Tap a goal to review it. Add as many as you want to work on
              together.
            </Text>
            {activeGoals.map((goal) => (
              <View key={goal.id}>
                <GoalListItem
                  goal={goal}
                  selected={selectedId === goal.id}
                  onCalendar={
                    goal.deadline ? () => void onAddToCalendar(goal) : undefined
                  }
                  calendarAdded={Boolean(calendarMarks[goal.id])}
                  onPress={() => {
                    setComposing(false)
                    setSelectedId((current) =>
                      current === goal.id ? null : goal.id,
                    )
                    setReview('')
                    setFormError(null)
                  }}
                />
                {selectedId === goal.id ? (
                  <GoalDetail
                    goal={goal}
                    reviews={selectedReviews}
                    reviewerName={reviewerName}
                    review={review}
                    onChangeReview={setReview}
                    onSaveReview={() => void onAddReview()}
                    onComplete={() => void onComplete()}
                    onCalendar={() => void onAddToCalendar(goal)}
                    calendarAdded={Boolean(calendarMarks[goal.id])}
                    saving={saving}
                    completing={completing}
                  />
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {completed.length > 0 ? (
          <View style={styles.sectionLast}>
            <Text style={styles.sectionTitle}>Reached together</Text>
            {completed.map((goal) => (
              <View key={goal.id}>
                <GoalListItem
                  goal={goal}
                  selected={selectedId === goal.id}
                  onPress={() => {
                    setComposing(false)
                    setSelectedId((current) =>
                      current === goal.id ? null : goal.id,
                    )
                    setReview('')
                    setFormError(null)
                  }}
                />
                {selectedId === goal.id ? (
                  <GoalDetail
                    goal={goal}
                    reviews={selectedReviews}
                    reviewerName={reviewerName}
                    review={review}
                    onChangeReview={setReview}
                    onSaveReview={() => void onAddReview()}
                    onComplete={() => void onComplete()}
                    onCalendar={
                      goal.deadline
                        ? () => void onAddToCalendar(goal)
                        : undefined
                    }
                    calendarAdded={Boolean(calendarMarks[goal.id])}
                    saving={saving}
                    completing={completing}
                    readOnly
                  />
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  )
}

function GoalListItem({
  goal,
  selected,
  onPress,
  onCalendar,
  calendarAdded,
}: {
  goal: CoupleGoal
  selected: boolean
  onPress: () => void
  onCalendar?: () => void
  calendarAdded?: boolean
}) {
  const overdue = isOverdue(goal.deadline, goal.status)
  return (
    <View style={[styles.goalRow, selected && styles.goalRowSelected]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.goalMain,
          pressed && styles.goalRowPressed,
        ]}
      >
        <Icon
          name={goal.status === 'completed' ? 'check' : 'target'}
          size={16}
          color={overdue ? colors.danger : colors.ink}
        />
        <View style={styles.goalCopy}>
          <Text style={styles.goalOutcome}>{goal.outcome}</Text>
          <Text style={[styles.meta, overdue && styles.deadlineOverdue]}>
            {deadlineLabel(goal)}
            {calendarAdded ? ' · On Google Calendar' : ''}
          </Text>
        </View>
        <Icon
          name={selected ? 'chevron-down' : 'chevron-right'}
          size={16}
          color={colors.muted}
        />
      </Pressable>
      {onCalendar ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            calendarAdded
              ? 'Open deadline in Google Calendar'
              : 'Add deadline to Google Calendar'
          }
          hitSlop={8}
          onPress={onCalendar}
          style={styles.calendarBtn}
        >
          <Icon name="calendar" size={16} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  )
}

function GoalDetail({
  goal,
  reviews,
  reviewerName,
  review,
  onChangeReview,
  onSaveReview,
  onComplete,
  onCalendar,
  calendarAdded,
  saving,
  completing,
  readOnly = false,
}: {
  goal: CoupleGoal
  reviews: CoupleGoalReview[]
  reviewerName: (userId: string) => string
  review: string
  onChangeReview: (value: string) => void
  onSaveReview: () => void
  onComplete: () => void
  onCalendar?: () => void
  calendarAdded: boolean
  saving: boolean
  completing: boolean
  readOnly?: boolean
}) {
  return (
    <View style={styles.goalDetail}>
      <View style={styles.smartList}>
        <SmartRow letter="S" label="Specific" body={goal.outcome} />
        <SmartRow
          letter="M"
          label="Measurable"
          body={
            goal.success_criteria ??
            'Add success criteria so you both know when this is done.'
          }
        />
        <SmartRow
          letter="A"
          label="Achievable"
          body={
            goal.realistic_plan ??
            'Say how this is realistic with the time and resources you have.'
          }
        />
        <SmartRow
          letter="R"
          label="Relevant"
          body={
            goal.why ?? 'Connect this to a shared value or bigger aim.'
          }
        />
        <SmartRow
          letter="T"
          label="Time-bound"
          body={
            goal.deadline
              ? `Reach this by ${shortDate(goal.deadline)}.`
              : 'Set a deadline so this has a real timeframe.'
          }
        />
      </View>

      {onCalendar ? (
        <TextLink
          label={
            calendarAdded
              ? 'Open deadline in Google Calendar'
              : 'Add deadline to Google Calendar'
          }
          onPress={onCalendar}
        />
      ) : null}

      <Text style={styles.sectionTitle}>Review together</Text>
      <Text style={styles.sectionHint}>
        Check progress against the success criteria. Both of you can write
        here.
      </Text>

      {reviews.length === 0 ? (
        <Text style={styles.emptyReviews}>
          No reviews yet.
          {readOnly ? '' : ' Write the first one together.'}
        </Text>
      ) : (
        reviews.map((item) => (
          <View key={item.id} style={styles.reviewRow}>
            <Text style={styles.reviewAuthor}>{reviewerName(item.user_id)}</Text>
            <Text style={styles.reviewNote}>{item.note}</Text>
            <Text style={styles.reviewWhen}>{shortDate(item.created_at)}</Text>
          </View>
        ))
      )}

      {readOnly ? null : (
        <>
          <Label>Today's review</Label>
          <Field
            value={review}
            onChangeText={onChangeReview}
            placeholder={
              goal.success_criteria
                ? `Did we move closer to: ${goal.success_criteria}`
                : 'What moved us closer to this outcome?'
            }
            autoCapitalize="sentences"
            multiline
            style={styles.multiline}
          />
          <PrimaryButton
            label="Save review"
            onPress={onSaveReview}
            loading={saving}
            disabled={review.trim().length === 0}
          />
          <TextLink
            label="We met the success criteria"
            onPress={onComplete}
            disabled={completing}
          />
        </>
      )}
    </View>
  )
}

function SmartRow({
  letter,
  label,
  body,
}: {
  letter: string
  label: string
  body: string
}) {
  return (
    <View style={styles.smartRow}>
      <View style={styles.smartBadge}>
        <Text style={styles.smartLetter}>{letter}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.smartLabel}>{label}</Text>
        <Text style={styles.smartBody}>{body}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 8 },
  section: {
    paddingVertical: 8,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
    marginBottom: 8,
  },
  sectionLast: {
    paddingVertical: 16,
  },
  addRow: {
    marginBottom: 8,
  },
  goalDetail: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  deadlineOverdue: {
    color: colors.danger,
  },
  smartList: {
    gap: 10,
    marginBottom: 12,
  },
  smartRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  smartBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  smartLetter: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
    fontWeight: '500',
  },
  smartLabel: {
    ...type.label,
    marginBottom: 0,
  },
  smartBody: {
    ...type.body,
    marginTop: 2,
  },
  meta: {
    ...type.label,
    marginTop: 4,
    marginBottom: 0,
  },
  sectionTitle: {
    ...type.heading,
    marginBottom: 4,
  },
  sectionHint: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  fieldHint: {
    ...type.body,
    color: colors.muted,
    marginBottom: 8,
    marginTop: -4,
  },
  emptyReviews: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  reviewRow: {
    paddingVertical: 12,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  reviewAuthor: {
    ...type.label,
    marginBottom: 4,
  },
  reviewNote: {
    ...type.body,
  },
  reviewWhen: {
    ...type.label,
    marginTop: 6,
    marginBottom: 0,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  shortArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  presetChip: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  presetChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  presetLabel: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
  presetLabelSelected: {
    color: colors.onAccent,
  },
  calendarToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  calendarToggleLabel: {
    ...type.body,
    flex: 1,
  },
  emptyTitle: {
    ...type.heading,
    marginBottom: 8,
  },
  emptyBody: {
    ...type.body,
    color: colors.muted,
    marginBottom: 16,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  goalRowSelected: {
    opacity: 1,
  },
  goalMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
  },
  goalRowPressed: {
    opacity: 0.7,
  },
  goalCopy: {
    flex: 1,
  },
  goalOutcome: {
    ...type.body,
    fontWeight: '500',
  },
  calendarBtn: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
})
