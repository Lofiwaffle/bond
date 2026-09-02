import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import Svg, { Circle } from 'react-native-svg'

import { ScoreMark } from './ui'
import { Icon } from '../lib/icons'
import { activityById } from '../lib/activities'
import { formatDisplayDate } from '../lib/dates'
import { colors, fonts, hairlineWidth, radii, type } from '../lib/theme'
import type { HistoryDay } from '../hooks/useCheckIn'
import type { DailyCheckIn } from '../types/database'

const AVATAR = 32

function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function relativeDay(date: string, today: string): string {
  if (date === today) return 'Today'
  const [ty, tm, td] = today.split('-').map(Number)
  const [y, m, d] = date.split('-').map(Number)
  const a = Date.UTC(ty, tm - 1, td)
  const b = Date.UTC(y, m - 1, d)
  const days = Math.round((a - b) / 86400000)
  if (days === 1) return 'Yesterday'
  return formatDisplayDate(date)
}

export function CheckInDayFeed({
  days,
  today,
  myName,
  partnerName,
}: {
  days: HistoryDay[]
  today: string
  myName: string
  partnerName: string | null
}) {
  const myInitial = initialOf(myName)
  const partnerInitial = initialOf(partnerName ?? 'Partner')
  return (
    <>
      {days.map((day) => (
        <CheckInDayGroup
          key={day.date}
          day={day}
          today={today}
          myName={myName}
          partnerName={partnerName}
          myInitial={myInitial}
          partnerInitial={partnerInitial}
        />
      ))}
    </>
  )
}

export function CheckInDayGroup({
  day,
  today,
  myName,
  partnerName,
  myInitial,
  partnerInitial,
}: {
  day: HistoryDay
  today: string
  myName: string
  partnerName: string | null
  myInitial: string
  partnerInitial: string
}) {
  const rows: TimelineItem[] = []

  if (day.mine) {
    rows.push({
      key: 'mine',
      tone: 'self',
      name: myName,
      initial: myInitial,
      checkIn: day.mine,
    })
  }

  if (day.revealed && day.partner) {
    rows.push({
      key: 'partner',
      tone: 'partner',
      name: partnerName ?? 'Partner',
      initial: partnerInitial,
      checkIn: day.partner,
    })
  } else if (day.mine && partnerName) {
    rows.push({
      key: 'waiting',
      tone: 'waiting',
      name: partnerName,
      initial: partnerInitial,
    })
  } else if (!day.mine && day.revealed && day.partner) {
    rows.push({
      key: 'partner',
      tone: 'partner',
      name: partnerName ?? 'Partner',
      initial: partnerInitial,
      checkIn: day.partner,
    })
  }

  return (
    <View>
      <DateRule label={relativeDay(day.date, today)} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${relativeDay(day.date, today)} check-in`}
        onPress={() => router.push(`/(app)/day/${day.date}`)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {rows.map((row, index) => (
          <TimelineRow
            key={row.key}
            item={row}
            connect={index < rows.length - 1}
          />
        ))}
      </Pressable>
    </View>
  )
}

type TimelineItem = {
  key: string
  tone: 'self' | 'partner' | 'waiting'
  name: string
  initial: string
  checkIn?: DailyCheckIn
}

function TimelineRow({
  item,
  connect,
}: {
  item: TimelineItem
  connect: boolean
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.rail}>
        <TimelineAvatar initial={item.initial} tone={item.tone} />
        {connect ? <View style={styles.connector} /> : null}
      </View>
      <View style={styles.entryBody}>
        {item.tone === 'waiting' || !item.checkIn ? (
          <Text style={styles.waiting}>
            {item.name} has not checked in yet. Yours stays private.
          </Text>
        ) : (
          <EntryCopy name={item.name} checkIn={item.checkIn} />
        )}
      </View>
    </View>
  )
}

function EntryCopy({
  name,
  checkIn,
}: {
  name: string
  checkIn: DailyCheckIn
}) {
  const question = checkIn.prompt_text?.trim() || ''
  const note =
    checkIn.prompt_answer?.trim() || checkIn.note?.trim() || ''
  const activities = checkIn.activities ?? []
  const feeling = checkIn.score

  return (
    <View style={styles.entryCopy}>
      <View
        accessible
        accessibilityLabel={`${name} checked in`}
        style={styles.entryLine}
      >
        <Text style={styles.entryMood}>
          <Text style={styles.entryName}>{name}</Text>
          {' · '}
        </Text>
        <ScoreMark score={feeling} size={22} />
      </View>
      {question ? <Text style={styles.entryPrompt}>{question}</Text> : null}
      {note ? <Text style={styles.entryNote}>{note}</Text> : null}
      <EntryChips ids={activities} />
    </View>
  )
}

function EntryChips({ ids }: { ids: string[] }) {
  if (!ids.length) return null
  return (
    <View style={styles.chipWrap}>
      {ids.map((id) => {
        const activity = activityById(id)
        if (!activity) return null
        return (
          <View key={id} style={styles.chip}>
            <Icon name={activity.icon} size={12} color={colors.ink} />
            <Text style={styles.chipLabel}>{activity.label}</Text>
          </View>
        )
      })}
    </View>
  )
}

function DateRule({ label }: { label: string }) {
  return (
    <View style={styles.dateRule}>
      <View style={styles.dateLine} />
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateLine} />
    </View>
  )
}

function TimelineAvatar({
  initial,
  tone,
}: {
  initial: string
  tone: 'self' | 'partner' | 'waiting'
}) {
  if (tone === 'waiting') {
    const r = AVATAR / 2 - 1
    return (
      <View style={styles.avatarSlot}>
        <Svg width={AVATAR} height={AVATAR}>
          <Circle
            cx={AVATAR / 2}
            cy={AVATAR / 2}
            r={r}
            stroke={colors.muted}
            strokeWidth={1}
            strokeDasharray="3 2.5"
            fill="none"
          />
        </Svg>
        <View style={styles.waitingLetterWrap}>
          <Text style={styles.waitingLetter}>{initial}</Text>
        </View>
      </View>
    )
  }

  return (
    <View
      style={[
        styles.avatar,
        tone === 'self' ? styles.avatarSelf : styles.avatarPartner,
      ]}
    >
      <Text style={styles.avatarLetter}>{initial}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  dateRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  dateLine: {
    flex: 1,
    height: hairlineWidth,
    backgroundColor: colors.hairline,
  },
  dateLabel: {
    ...type.label,
    marginBottom: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 20,
    gap: 12,
  },
  rail: {
    width: AVATAR,
    alignItems: 'center',
  },
  connector: {
    width: hairlineWidth,
    flex: 1,
    backgroundColor: colors.hairline,
    marginTop: 4,
    minHeight: 16,
  },
  avatarSlot: {
    width: AVATAR,
    height: AVATAR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelf: {
    backgroundColor: colors.accent,
  },
  avatarPartner: {
    backgroundColor: colors.success,
  },
  avatarLetter: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.ink,
  },
  waitingLetterWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingLetter: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.muted,
  },
  entryBody: {
    flex: 1,
    paddingBottom: 16,
  },
  entryCopy: {
    gap: 6,
  },
  entryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryName: {
    ...type.body,
    fontFamily: fonts.medium,
    fontWeight: '500',
  },
  entryMood: {
    ...type.body,
  },
  entryPrompt: {
    ...type.label,
    color: colors.muted,
    marginBottom: 0,
  },
  entryNote: {
    ...type.body,
    fontSize: 16,
    lineHeight: 22,
  },
  waiting: {
    ...type.body,
    color: colors.muted,
    paddingTop: 6,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipLabel: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
})
