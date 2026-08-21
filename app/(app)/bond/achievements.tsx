import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { BondSectionHeader } from '../../../components/BondSectionHeader'
import {
  AchievementCalendar,
  ErrorText,
  Field,
  LoadingScreen,
  PrimaryButton,
  Screen,
  TextLink,
} from '../../../components/ui'
import { useHabitBadges } from '../../../hooks/useHabitBadges'
import { useAuth } from '../../../lib/auth'
import {
  BADGES,
  badgesForProgress,
  habitLocalDate,
  type BadgeId,
} from '../../../lib/badges'
import { formatDisplayDate, localDateString } from '../../../lib/dates'
import { Icon } from '../../../lib/icons'
import { colors, hairlineWidth, radii, type } from '../../../lib/theme'
import type { HabitCompletion } from '../../../types/database'

const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b])) as Record<
  BadgeId,
  (typeof BADGES)[number]
>

type MemoryFilter = 'all' | BadgeId

export default function BondAchievementsScreen() {
  const { user, partner, isLoading: authLoading } = useAuth()
  const { counts, completions, isLoading, logHabit, updateNote } =
    useHabitBadges()

  const [activeHabitId, setActiveHabitId] = useState<BadgeId | null>(null)
  const [habitNote, setHabitNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(localDateString())
  const [memoryFilter, setMemoryFilter] = useState<MemoryFilter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const memories = useMemo(() => {
    return completions.filter((row) => {
      if (memoryFilter !== 'all' && row.habit_id !== memoryFilter) return false
      return true
    })
  }, [completions, memoryFilter])

  if (authLoading || isLoading) return <LoadingScreen />

  const badges = badgesForProgress({ completions: counts })
  const activeBadge = badges.find((b) => b.id === activeHabitId) ?? null
  const earnedCount = badges.filter((b) => b.earned).length

  const selectedEntries = completions.filter(
    (row) => habitLocalDate(row.created_at) === selectedDate,
  )

  const openAchievement = (id: BadgeId) => {
    setActiveHabitId(id)
    setHabitNote('')
    setError(null)
  }

  const closeAchievement = () => {
    setActiveHabitId(null)
    setHabitNote('')
    setError(null)
  }

  const onLogAchievement = async () => {
    if (!activeHabitId) return
    setSubmitting(true)
    const result = await logHabit(activeHabitId, habitNote)
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSelectedDate(localDateString())
    setMemoryFilter('all')
    closeAchievement()
  }

  const startEdit = (row: HabitCompletion) => {
    setEditingId(row.id)
    setEditDraft(row.note ?? '')
    setEditError(null)
    setSelectedDate(habitLocalDate(row.created_at))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft('')
    setEditError(null)
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSavingEdit(true)
    const result = await updateNote(editingId, editDraft)
    setSavingEdit(false)
    if (result.error) {
      setEditError(result.error)
      return
    }
    cancelEdit()
  }

  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BondSectionHeader
          title="Achievements"
          subtitle={
            partner
              ? `Milestones you unlock with ${partner.display_name}. ${earnedCount}/5 earned.`
              : `Milestones you unlock together. ${earnedCount}/5 earned.`
          }
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendar</Text>
          <Text style={styles.sectionHint}>
            Tap a day to read it. Tap a badge below to log a new one.
          </Text>
          <AchievementCalendar
            completions={completions}
            selectedDate={selectedDate}
            onPressDate={setSelectedDate}
            onPressAchievement={openAchievement}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedDate === localDateString()
              ? 'Today'
              : formatDisplayDate(selectedDate)}
          </Text>
          {selectedEntries.length === 0 ? (
            <Text style={styles.sectionHint}>
              Nothing logged this day yet.
            </Text>
          ) : (
            selectedEntries.map((completion) => (
              <AchievementNote
                key={completion.id}
                habitId={completion.habit_id as BadgeId}
                note={completion.note}
                author={
                  completion.user_id === user?.id
                    ? 'You'
                    : (partner?.display_name ?? 'Partner')
                }
              />
            ))
          )}
        </View>

        {activeBadge ? (
          <View style={styles.section}>
            <View style={styles.activeTitle}>
              <Icon name={activeBadge.icon} size={18} color={colors.ink} />
              <Text style={styles.sectionTitle}>{activeBadge.label}</Text>
            </View>
            <Text style={styles.sectionHint}>{activeBadge.quest}</Text>
            <Text style={styles.fieldLabel}>Note</Text>
            <Field
              value={habitNote}
              onChangeText={setHabitNote}
              placeholder="What happened? This note becomes a memory."
              autoCapitalize="sentences"
              autoCorrect
              multiline
              style={styles.note}
            />
            <ErrorText message={error} />
            <PrimaryButton
              label="Save achievement"
              onPress={() => void onLogAchievement()}
              loading={submitting}
            />
            <TextLink label="Cancel" onPress={closeAchievement} />
          </View>
        ) : null}

        <View style={styles.sectionLast}>
          <Text style={styles.sectionTitle}>Our Memories</Text>
          <Text style={styles.sectionHint}>
            Everything you and your partner have logged. Tap one to open that
            day, or edit a note you wrote.
          </Text>
          <View style={styles.filterRow}>
            <FilterChip
              label="All"
              selected={memoryFilter === 'all'}
              onPress={() => setMemoryFilter('all')}
            />
            {BADGES.map((badge) => (
              <FilterChip
                key={badge.id}
                label={badge.label}
                selected={memoryFilter === badge.id}
                onPress={() => setMemoryFilter(badge.id)}
              />
            ))}
          </View>
          {memories.length === 0 ? (
            <Text style={styles.sectionHint}>
              {memoryFilter === 'all'
                ? 'Log an achievement to start this collection.'
                : `No ${BADGE_BY_ID[memoryFilter].label} memories yet.`}
            </Text>
          ) : (
            memories.map((completion) => {
              const isOwn = completion.user_id === user?.id
              const date = habitLocalDate(completion.created_at)
              const editing = editingId === completion.id
              return (
                <AchievementNote
                  key={completion.id}
                  habitId={completion.habit_id as BadgeId}
                  note={completion.note}
                  author={isOwn ? 'You' : (partner?.display_name ?? 'Partner')}
                  date={formatDisplayDate(date)}
                  selected={date === selectedDate}
                  onPress={() => setSelectedDate(date)}
                  onEdit={isOwn ? () => startEdit(completion) : undefined}
                  editing={editing}
                  draft={editing ? editDraft : undefined}
                  onChangeDraft={setEditDraft}
                  onSaveEdit={() => void saveEdit()}
                  onCancelEdit={cancelEdit}
                  saving={savingEdit}
                  editError={editing ? editError : null}
                />
              )
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  )
}

function AchievementNote({
  habitId,
  note,
  author,
  date,
  selected,
  onPress,
  onEdit,
  editing,
  draft,
  onChangeDraft,
  onSaveEdit,
  onCancelEdit,
  saving,
  editError,
}: {
  habitId: BadgeId
  note: string | null
  author: string
  date?: string
  selected?: boolean
  onPress?: () => void
  onEdit?: () => void
  editing?: boolean
  draft?: string
  onChangeDraft?: (value: string) => void
  onSaveEdit?: () => void
  onCancelEdit?: () => void
  saving?: boolean
  editError?: string | null
}) {
  const badge = BADGE_BY_ID[habitId]
  const body = note?.trim()
  const Card = onPress ? Pressable : View

  return (
    <Card
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        onPress
          ? `${badge.label} memory by ${author}${date ? `, ${date}` : ''}`
          : undefined
      }
      onPress={editing ? undefined : onPress}
      style={[styles.noteCard, selected && styles.noteCardSelected]}
    >
      <View style={styles.noteCardHead}>
        <Icon name={badge.icon} size={16} color={colors.ink} />
        <Text style={styles.noteMeta}>
          {badge.label} · {author}
          {date ? ` · ${date}` : ''}
        </Text>
        {onEdit && !editing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit memory"
            onPress={onEdit}
            hitSlop={8}
          >
            <Text style={styles.editLabel}>Edit</Text>
          </Pressable>
        ) : null}
      </View>
      {editing ? (
        <>
          <Field
            value={draft ?? ''}
            onChangeText={(value) => onChangeDraft?.(value)}
            placeholder="What do you want to remember?"
            autoCapitalize="sentences"
            autoCorrect
            multiline
            style={styles.note}
          />
          <ErrorText message={editError ?? null} />
          <PrimaryButton
            label="Save memory"
            onPress={() => onSaveEdit?.()}
            loading={saving}
          />
          <TextLink label="Cancel" onPress={() => onCancelEdit?.()} />
        </>
      ) : body ? (
        <Text style={styles.noteBody}>{body}</Text>
      ) : (
        <Text style={styles.noteEmpty}>Logged without a note.</Text>
      )}
    </Card>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 8,
  },
  section: {
    paddingVertical: 8,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
    marginBottom: 8,
  },
  sectionLast: {
    paddingVertical: 16,
  },
  sectionTitle: {
    ...type.heading,
    marginBottom: 4,
  },
  activeTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionHint: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipLabel: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
  chipLabelSelected: {
    color: colors.onAccent,
  },
  fieldLabel: {
    ...type.label,
    marginBottom: 6,
  },
  note: {
    minHeight: 96,
    textAlignVertical: 'top',
    marginBottom: 8,
    borderRadius: radii.md,
  },
  noteCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
  },
  noteCardSelected: {
    borderColor: colors.accent,
  },
  noteCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noteMeta: {
    ...type.label,
    marginBottom: 0,
    flex: 1,
  },
  editLabel: {
    ...type.label,
    color: colors.accent,
    marginBottom: 0,
  },
  noteBody: {
    ...type.body,
  },
  noteEmpty: {
    ...type.body,
    color: colors.muted,
  },
})
