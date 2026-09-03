import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { ErrorText, Field, PrimaryButton } from './ui'
import {
  DATE_WHEN_TIMES,
  DATE_WHERE_SUGGESTIONS,
  datePlanReady,
  upcomingDateChips,
  type DateWhenTime,
} from '../lib/datePlan'
import { Icon, type IconName } from '../lib/icons'
import { DATE_DECK } from '../lib/plays'
import { colors, hairlineWidth, radii, type } from '../lib/theme'
import type { Json } from '../types/database'

function Chip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string
  icon?: IconName
  selected?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon ? (
        <Icon name={icon} size={14} color={selected ? colors.onAccent : colors.ink} />
      ) : null}
      <Text style={[styles.chipLabel, selected && styles.chipLabelOn]}>{label}</Text>
    </Pressable>
  )
}

export function DatePlanForm({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean
  error: string | null
  onSubmit: (payload: Json) => Promise<void>
}) {
  const days = useMemo(() => upcomingDateChips(), [])
  const [whatId, setWhatId] = useState<string | null>(null)
  const [whatCustom, setWhatCustom] = useState('')
  const [when, setWhen] = useState('')
  const [whenCustom, setWhenCustom] = useState('')
  const [whenTime, setWhenTime] = useState<DateWhenTime>('evening')
  const [wherePick, setWherePick] = useState<string | null>(null)
  const [whereCustom, setWhereCustom] = useState('')
  const [why, setWhy] = useState('')

  const what = whatCustom.trim() || DATE_DECK.find((idea) => idea.id === whatId)?.label || ''
  const where = whereCustom.trim() || wherePick || ''
  const ready = datePlanReady({ what, when, where })

  return (
    <View>
      <Text style={styles.kicker}>What are we doing</Text>
      <View style={styles.chipWrap}>
        {DATE_DECK.map((idea) => (
          <Chip
            key={idea.id}
            label={idea.label}
            icon={idea.icon}
            selected={!whatCustom.trim() && whatId === idea.id}
            onPress={() => {
              setWhatId(idea.id)
              setWhatCustom('')
            }}
          />
        ))}
      </View>
      <Field
        value={whatCustom}
        onChangeText={setWhatCustom}
        placeholder="Or write your own"
        accessibilityLabel="What are we doing, write your own"
        autoCapitalize="sentences"
      />

      <Text style={styles.kicker}>When</Text>
      <View style={styles.chipWrap}>
        {days.map((day) => (
          <Chip
            key={day.iso}
            label={day.label}
            selected={!whenCustom.trim() && when === day.iso}
            onPress={() => {
              setWhen(day.iso)
              setWhenCustom('')
            }}
          />
        ))}
      </View>
      <View style={styles.chipWrap}>
        {DATE_WHEN_TIMES.map((slot) => (
          <Chip
            key={slot.id}
            label={slot.label}
            selected={whenTime === slot.id}
            onPress={() => setWhenTime(slot.id)}
          />
        ))}
      </View>
      <Field
        value={whenCustom}
        onChangeText={(text) => {
          setWhenCustom(text)
          if (/^\d{4}-\d{2}-\d{2}$/.test(text.trim())) setWhen(text.trim())
        }}
        placeholder="Or another day (YYYY-MM-DD)"
        accessibilityLabel="Another day, year month day"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.kicker}>Where</Text>
      <View style={styles.chipWrap}>
        {DATE_WHERE_SUGGESTIONS.map((place) => (
          <Chip
            key={place}
            label={place}
            selected={!whereCustom.trim() && wherePick === place}
            onPress={() => {
              setWherePick(place)
              setWhereCustom('')
            }}
          />
        ))}
      </View>
      <Field
        value={whereCustom}
        onChangeText={setWhereCustom}
        placeholder="Or write your own"
        accessibilityLabel="Where, write your own"
        autoCapitalize="sentences"
      />

      <Text style={styles.kicker}>Why</Text>
      <Field
        value={why}
        onChangeText={setWhy}
        placeholder="Why this date, for the two of you"
        accessibilityLabel="Why this date"
        autoCapitalize="sentences"
        multiline
        style={styles.multiline}
      />

      <ErrorText message={error} />
      <PrimaryButton
        label={busy ? 'Submitting…' : 'Submit'}
        disabled={!ready}
        loading={busy}
        onPress={() =>
          void onSubmit({
            what,
            when,
            whenTime,
            where,
            why: why.trim(),
          } as unknown as Json)
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  kicker: {
    ...type.label,
    color: colors.accentFill,
    marginTop: 16,
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
  },
  chipSelected: {
    backgroundColor: colors.accentFill,
    borderColor: colors.accentFill,
  },
  chipLabel: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
  chipLabelOn: {
    color: colors.onAccent,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
})
