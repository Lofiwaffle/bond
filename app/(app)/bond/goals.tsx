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
  StatusPanel,
  TextLink,
} from '../../../components/ui'
import { useCoupleGoal } from '../../../hooks/useCoupleGoal'
import { useAuth } from '../../../lib/auth'
import { formatDisplayDate, localDateString } from '../../../lib/dates'
import {
  loadCalendarMarks,
  openGoogleCalendarDeadline,
} from '../../../lib/googleCalendar'
import { Icon, type IconName } from '../../../lib/icons'
import { useToast } from '../../../lib/toast'
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

function goalIcon(goal: CoupleGoal): IconName {
  if (goal.status === 'completed') return 'check'
  if (goal.status === 'proposed') return 'clock'
  if (goal.status === 'declined') return 'x'
  if (goal.status === 'archived') return 'archive'
  return 'target'
}

function listMeta(
  goal: CoupleGoal,
  me: string | undefined,
  partnerName: string,
): string {
  if (goal.status === 'proposed') {
    return goal.created_by === me
      ? `Waiting for ${partnerName} to agree`
      : `${partnerName} offered this`
  }
  if (goal.status === 'declined') {
    return `Passed on · ${goal.declined_at ? shortDate(goal.declined_at) : deadlineLabel(goal)}`
  }
  if (goal.status === 'archived') {
    return goal.archived_at
      ? `Archived ${shortDate(goal.archived_at)}`
      : 'Archived'
  }
  if (goal.status === 'active' && goal.completion_requested_by) {
    return goal.completion_requested_by === me
      ? `Waiting for ${partnerName} to confirm it's done`
      : `${partnerName} thinks this is done`
  }
  return deadlineLabel(goal)
}

export default function BondGoalsScreen() {
  const { user, partner, isLoading: authLoading } = useAuth()
  const {
    proposedByMe,
    proposedByPartner,
    activeGoals,
    completed,
    declined,
    archived,
    reviewsFor,
    isLoading,
    error,
    setGoal,
    addReview,
    acceptGoal,
    declineGoal,
    archiveGoal,
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
  const { showToast } = useToast()

  const allGoals = [
    ...proposedByPartner,
    ...proposedByMe,
    ...activeGoals,
    ...completed,
    ...declined,
    ...archived,
  ]
  const hasGoals = allGoals.length > 0
  const showForm = composing || !hasGoals

  const partnerName = partner?.display_name ?? 'your partner'
  const selected = allGoals.find((goal) => goal.id === selectedId) ?? null
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

  const selectGoal = (goalId: string) => {
    setComposing(false)
    setSelectedId((current) => (current === goalId ? null : goalId))
    setReview('')
    setFormError(null)
  }

  const onSetGoal = async () => {
    if (saving) return
    setFormError(null)
    setSaving(true)
    const result = await setGoal(draft)
    setSaving(false)
    if (result.error || !result.goal) {
      setFormError(result.error ?? 'Could not offer this goal.')
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
    showToast(`Offered. Waiting for ${partnerName} to agree.`)
  }

  const onAddReview = async () => {
    if (!selected || saving) return
    setFormError(null)
    setSaving(true)
    const result = await addReview(selected.id, review)
    setSaving(false)
    if (result.error) {
      setFormError(result.error)
      return
    }
    setReview('')
    showToast('Review saved')
  }

  const onComplete = async () => {
    if (!selected || completing) return
    setFormError(null)
    setCompleting(true)
    const result = await completeGoal(selected.id)
    setCompleting(false)
    if (result.error) {
      setFormError(result.error)
      return
    }
    setReview('')
    showToast(
      result.waiting
        ? `Waiting for ${partnerName} to confirm this is done.`
        : 'You both marked this complete.',
    )
  }

  const onAccept = async () => {
    if (!selected || completing) return
    setFormError(null)
    setCompleting(true)
    const result = await acceptGoal(selected.id)
    setCompleting(false)
    if (result.error) {
      setFormError(result.error)
      return
    }
    showToast('This is a shared goal now.')
  }

  const onDecline = async () => {
    if (!selected || completing) return
    setFormError(null)
    setCompleting(true)
    const result = await declineGoal(selected.id)
    setCompleting(false)
    if (result.error) {
      setFormError(result.error)
      return
    }
    showToast('Passed on this goal.')
  }

  const onArchive = async () => {
    if (!selected || completing) return
    const withdrawing = selected.status === 'proposed'
    setFormError(null)
    setCompleting(true)
    const result = await archiveGoal(selected.id)
    setCompleting(false)
    if (result.error) {
      setFormError(result.error)
      return
    }
    showToast(withdrawing ? 'Offer withdrawn.' : 'Goal archived.')
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

  const detailFor = (goal: CoupleGoal, readOnly = false) =>
    selectedId === goal.id ? (
      <GoalDetail
        goal={goal}
        me={user?.id}
        partnerName={partnerName}
        reviews={selectedReviews}
        reviewerName={reviewerName}
        review={review}
        onChangeReview={setReview}
        onSaveReview={() => void onAddReview()}
        onComplete={() => void onComplete()}
        onAccept={() => void onAccept()}
        onDecline={() => void onDecline()}
        onArchive={() => void onArchive()}
        onCalendar={
          goal.deadline ? () => void onAddToCalendar(goal) : undefined
        }
        calendarAdded={Boolean(calendarMarks[goal.id])}
        saving={saving}
        completing={completing}
        readOnly={readOnly}
      />
    ) : null

  const listFor = (
    goals: CoupleGoal[],
    opts?: { calendar?: boolean; readOnly?: boolean },
  ) =>
    goals.map((goal) => (
      <View key={goal.id}>
        <GoalListItem
          goal={goal}
          me={user?.id}
          partnerName={partnerName}
          selected={selectedId === goal.id}
          onCalendar={
            opts?.calendar && goal.deadline
              ? () => void onAddToCalendar(goal)
              : undefined
          }
          calendarAdded={Boolean(calendarMarks[goal.id])}
          onPress={() => selectGoal(goal.id)}
        />
        {detailFor(goal, opts?.readOnly)}
      </View>
    ))

  return (
    <Screen style={styles.screen} keyboard>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BondSectionHeader
          title="Goals"
          subtitle={`Offer a SMART goal${
            partner ? ` to ${partnerName}` : ''
          }. It becomes shared after they agree. Completing takes both of you.`}
        />

        {error ? (
          <StatusPanel message="Couldn't load your goals." />
        ) : null}
        <ErrorText message={formError} />

        {hasGoals && !showForm ? (
          <View style={styles.addRow}>
            <TextLink
              label="Offer another goal"
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
            <Text style={styles.emptyTitle}>Offer a SMART goal</Text>
            <Text style={styles.emptyBody}>
              Name a well-defined outcome. Make it measurable, realistic, tied
              to what you value, and give it a deadline. {partnerName} will
              need to agree before it is yours together.
            </Text>

            <Label>S · Specific outcome</Label>
            <Text style={styles.fieldHint}>
              Identify a single, well-defined result you can both picture.
            </Text>
            <Field
              value={draft.outcome}
              onChangeText={(value) => updateDraft('outcome', value)}
              placeholder="Book a weekend trip just for us"
              accessibilityLabel="Specific outcome"
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
              accessibilityLabel="Success criteria"
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
              accessibilityLabel="Achievable plan"
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
              accessibilityLabel="Why this goal matters"
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
                    accessibilityLabel={preset.label}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => updateDraft('deadline', value)}
                    style={(state) => [
                      styles.presetChip,
                      isSelected && styles.presetChipSelected,
                      state.pressed && { opacity: 0.8 },
                      Boolean((state as { focused?: boolean }).focused) &&
                        styles.presetFocus,
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
              accessibilityLabel="Deadline"
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
              label="Offer this SMART goal"
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

        {proposedByPartner.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Waiting on you</Text>
            <Text style={styles.sectionHint}>
              {partnerName} offered {proposedByPartner.length === 1 ? 'this' : 'these'}.
              Agree or pass.
            </Text>
            {listFor(proposedByPartner)}
          </View>
        ) : null}

        {proposedByMe.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Waiting on them</Text>
            <Text style={styles.sectionHint}>
              {partnerName} has not agreed yet. You can withdraw an offer.
            </Text>
            {listFor(proposedByMe)}
          </View>
        ) : null}

        {activeGoals.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your goals</Text>
            <Text style={styles.sectionHint}>
              You both agreed to these. Completing takes both of you.
            </Text>
            {listFor(activeGoals, { calendar: true })}
          </View>
        ) : null}

        {completed.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reached together</Text>
            {listFor(completed, { readOnly: true })}
          </View>
        ) : null}

        {declined.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Not this one</Text>
            {listFor(declined, { readOnly: true })}
          </View>
        ) : null}

        {archived.length > 0 ? (
          <View style={styles.sectionLast}>
            <Text style={styles.sectionTitle}>Archived</Text>
            {listFor(archived, { readOnly: true })}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  )
}

function GoalListItem({
  goal,
  me,
  partnerName,
  selected,
  onPress,
  onCalendar,
  calendarAdded,
}: {
  goal: CoupleGoal
  me?: string
  partnerName: string
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
          name={goalIcon(goal)}
          size={16}
          color={overdue ? colors.danger : colors.ink}
        />
        <View style={styles.goalCopy}>
          <Text style={styles.goalOutcome}>{goal.outcome}</Text>
          <Text style={[styles.meta, overdue && styles.deadlineOverdue]}>
            {listMeta(goal, me, partnerName)}
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
  me,
  partnerName,
  reviews,
  reviewerName,
  review,
  onChangeReview,
  onSaveReview,
  onComplete,
  onAccept,
  onDecline,
  onArchive,
  onCalendar,
  calendarAdded,
  saving,
  completing,
  readOnly = false,
}: {
  goal: CoupleGoal
  me?: string
  partnerName: string
  reviews: CoupleGoalReview[]
  reviewerName: (userId: string) => string
  review: string
  onChangeReview: (value: string) => void
  onSaveReview: () => void
  onComplete: () => void
  onAccept: () => void
  onDecline: () => void
  onArchive: () => void
  onCalendar?: () => void
  calendarAdded: boolean
  saving: boolean
  completing: boolean
  readOnly?: boolean
}) {
  const offeredByMe = goal.created_by === me
  const waitingOnMe = Boolean(
    goal.status === 'active' &&
      goal.completion_requested_by &&
      goal.completion_requested_by !== me,
  )
  const waitingOnThem = Boolean(
    goal.status === 'active' && goal.completion_requested_by === me,
  )

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

      {goal.status === 'proposed' && !offeredByMe ? (
        <>
          <Text style={styles.sectionHint}>
            {partnerName} offered this. It is not a shared goal until you
            agree.
          </Text>
          <PrimaryButton
            label="Yes, this is ours"
            onPress={onAccept}
            loading={completing}
          />
          <TextLink
            label="Not this one"
            onPress={onDecline}
            disabled={completing}
          />
        </>
      ) : null}

      {goal.status === 'proposed' && offeredByMe ? (
        <>
          <Text style={styles.sectionHint}>
            Waiting for {partnerName} to agree. They will see this on Goals.
          </Text>
          <TextLink
            label="Withdraw this offer"
            onPress={onArchive}
            disabled={completing}
          />
        </>
      ) : null}

      {goal.status === 'completed' ? (
        <Text style={styles.sectionHint}>
          You both marked this complete.
          {goal.completion_requested_by
            ? ` ${reviewerName(goal.completion_requested_by)} said it was done first.`
            : ''}
          {goal.completed_by
            ? ` ${reviewerName(goal.completed_by)} confirmed${
                goal.completed_at ? ` on ${shortDate(goal.completed_at)}` : ''
              }.`
            : ''}
        </Text>
      ) : null}

      {goal.status === 'declined' ? (
        <>
          <Text style={styles.sectionHint}>
            {goal.declined_by
              ? `${reviewerName(goal.declined_by)} passed on this.`
              : 'This was passed on.'}{' '}
            Either of you can archive it.
          </Text>
          <TextLink
            label="Archive"
            onPress={onArchive}
            disabled={completing}
          />
        </>
      ) : null}

      {goal.status === 'archived' ? (
        <Text style={styles.sectionHint}>
          Archived
          {goal.archived_by ? ` by ${reviewerName(goal.archived_by)}` : ''}
          {goal.archived_at ? ` on ${shortDate(goal.archived_at)}` : ''}.
        </Text>
      ) : null}

      {goal.status === 'active' || goal.status === 'completed' ? (
        <>
          <Text style={styles.sectionTitle}>Progress notes</Text>
          <Text style={styles.sectionHint}>
            Check progress against the success criteria. Either of you can write
            here. You do not have to review this out loud together.
          </Text>

          {reviews.length === 0 ? (
            <Text style={styles.emptyReviews}>
              No notes yet.
              {readOnly || goal.status !== 'active'
                ? ''
                : ' You can add one from here.'}
            </Text>
          ) : (
            reviews.map((item) => (
              <View key={item.id} style={styles.reviewRow}>
                <Text style={styles.reviewAuthor}>
                  {reviewerName(item.user_id)}
                </Text>
                <Text style={styles.reviewNote}>{item.note}</Text>
                <Text style={styles.reviewWhen}>{shortDate(item.created_at)}</Text>
              </View>
            ))
          )}
        </>
      ) : null}

      {goal.status === 'active' ? (
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
          {waitingOnThem ? (
            <Text style={styles.sectionHint}>
              Waiting for {partnerName} to confirm this is done.
            </Text>
          ) : (
            <TextLink
              label={
                waitingOnMe
                  ? 'Yes — we met the success criteria'
                  : 'I think we met the success criteria'
              }
              onPress={onComplete}
              disabled={completing}
            />
          )}
          <TextLink
            label="Archive this goal"
            onPress={onArchive}
            disabled={completing}
          />
        </>
      ) : null}
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
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  presetChipSelected: {
    backgroundColor: colors.accentFill,
    borderColor: colors.accentFill,
  },
  presetFocus: {
    borderWidth: 2,
    borderColor: colors.ink,
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
    minHeight: 44,
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
