import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { ScoreMark } from './ui'
import { activityById } from '../lib/activities'
import { formatDisplayDate } from '../lib/dates'
import { Icon, type IconName } from '../lib/icons'
import {
  CHALLENGES,
  DATE_DECK,
  DREAM_CATEGORIES,
  overlapStrings,
  playHref,
  playMeta,
  type PlayKind,
} from '../lib/plays'
import { colors, fonts, hairlineWidth, radii, type } from '../lib/theme'
import type { HistoryDay } from '../hooks/useCheckIn'
import type { PlayWithAnswers } from '../hooks/useCouplePlay'
import type { DailyCheckIn, Json, Ritual } from '../types/database'

const AVATAR = 40

type FeedItem = {
  id: string
  at: string
  href?: string
  icon: IconName
  kicker: string
  name: string
  initial: string
  tone: 'self' | 'partner' | 'waiting' | 'shared'
  body?: string
  prompt?: string
  chips?: { label: string; icon?: IconName }[]
  score?: number
}

function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function relativeTime(iso: string, today: string): string {
  const date = iso.slice(0, 10)
  if (date === today) {
    const then = Date.parse(iso)
    if (!Number.isNaN(then)) {
      const minutes = Math.max(0, Math.round((Date.now() - then) / 60000))
      if (minutes < 1) return 'now'
      if (minutes < 60) return `${minutes}m`
      const hours = Math.round(minutes / 60)
      if (hours < 24) return `${hours}h`
    }
    return 'Today'
  }
  const yesterday = new Date(`${today}T00:00:00`)
  yesterday.setDate(yesterday.getDate() - 1)
  const ymd = yesterday.toISOString().slice(0, 10)
  if (date === ymd) return 'Yesterday'
  return formatDisplayDate(date)
}

function asRecord(value: Json | null | undefined): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : []
}

function playBody(play: PlayWithAnswers, partnerName: string): {
  body: string
  chips: { label: string; icon?: IconName }[]
} {
  const prompt = asRecord(play.prompt)
  const mine = asRecord(play.mine?.payload)
  const theirs = asRecord(play.partner?.payload)
  const revealed = Boolean(play.revealed_at && play.mine && play.partner)

  if (!play.mine) {
    return { body: 'Open this to answer privately.', chips: [] }
  }
  if (!revealed) {
    return {
      body: `${partnerName} has not answered yet. Yours stays private.`,
      chips: [],
    }
  }

  if (play.kind === 'know_me') {
    const truth = asString(mine.option) || asString(theirs.option)
    const guess = asString(mine.guess) || asString(theirs.guess)
    const match = Boolean(truth && guess && truth === guess)
    return {
      body: match
        ? `Match point. You both landed on “${truth}”.`
        : `You chose different answers. The preference was “${truth || 'hidden'}”.`,
      chips: [],
    }
  }

  if (play.kind === 'choose_date') {
    const overlap = overlapStrings(asStrings(mine.picks), asStrings(theirs.picks))
    if (!overlap.length) {
      return { body: 'No overlap this round. Try another deck whenever you like.', chips: [] }
    }
    return {
      body: 'Only the matches are here.',
      chips: overlap.map((id) => {
        const idea = DATE_DECK.find((item) => item.id === id)
        return { label: idea?.label ?? id, icon: idea?.icon }
      }),
    }
  }

  if (play.kind === 'appreciation') {
    const noticed = asString(mine.noticed) || asString(theirs.noticed)
    return {
      body: noticed || 'An appreciation is open for both of you.',
      chips: [],
    }
  }

  if (play.kind === 'memory') {
    return {
      body: asString(mine.text) || asString(prompt.text) || 'A memory you keep.',
      chips: [],
    }
  }

  if (play.kind === 'dreams') {
    const chips: { label: string; icon?: IconName }[] = []
    for (const category of DREAM_CATEGORIES) {
      const overlap = overlapStrings(
        asStrings(mine[category.id]),
        asStrings(theirs[category.id]),
      )
      for (const label of overlap) {
        chips.push({ label, icon: category.icon })
      }
    }
    return {
      body: chips.length ? 'Where your wishes overlap.' : 'No overlap in this round.',
      chips,
    }
  }

  if (play.kind === 'challenge') {
    const id = asString(prompt.id)
    const mission = CHALLENGES.find((item) => item.id === id)
    return {
      body: mission?.label ?? 'A small mission for the two of you.',
      chips: [],
    }
  }

  if (play.kind === 'repair') {
    return { body: 'You both finished a repair round.', chips: [] }
  }

  return { body: playMeta(play.kind).title, chips: [] }
}

function checkInItems(
  day: HistoryDay,
  today: string,
  myName: string,
  partnerName: string | null,
): FeedItem[] {
  const items: FeedItem[] = []
  const pushCheckIn = (
    checkIn: DailyCheckIn,
    name: string,
    tone: 'self' | 'partner',
  ) => {
    const activities = (checkIn.activities ?? [])
      .map((id) => activityById(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
    items.push({
      id: checkIn.id,
      at: checkIn.created_at || `${day.date}T12:00:00`,
      href: `/(app)/day/${day.date}`,
      icon: 'message-circle',
      kicker: 'Daily question',
      name,
      initial: initialOf(name),
      tone,
      prompt: checkIn.prompt_text?.trim() || undefined,
      body: checkIn.prompt_answer?.trim() || checkIn.note?.trim() || undefined,
      score: checkIn.score,
      chips: activities.map((item) => ({ label: item.label, icon: item.icon })),
    })
  }

  if (day.mine) pushCheckIn(day.mine, myName, 'self')
  if (day.revealed && day.partner && partnerName) {
    pushCheckIn(day.partner, partnerName, 'partner')
  } else if (day.mine && partnerName) {
    items.push({
      id: `${day.date}-waiting`,
      at: day.mine.created_at || `${day.date}T12:00:00`,
      href: `/(app)/day/${day.date}`,
      icon: 'message-circle',
      kicker: 'Daily question',
      name: partnerName,
      initial: initialOf(partnerName),
      tone: 'waiting',
      body: `${partnerName} has not checked in yet. Yours stays private.`,
    })
  }
  return items
}

export function FeedThread({
  days,
  plays,
  rituals,
  today,
  myName,
  partnerName,
}: {
  days: HistoryDay[]
  plays: PlayWithAnswers[]
  rituals: Ritual[]
  today: string
  myName: string
  partnerName: string | null
}) {
  const items: FeedItem[] = []

  for (const day of days) {
    items.push(...checkInItems(day, today, myName, partnerName))
  }

  for (const play of plays) {
    if (play.kind === 'repair' && !play.revealed_at) continue
    const meta = playMeta(play.kind)
    const summary = playBody(play, partnerName ?? 'your person')
    const who = play.mine ? myName : partnerName ?? 'Together'
    items.push({
      id: play.id,
      at: play.mine?.created_at || play.created_at,
      href: playHref(play.kind as PlayKind) as string,
      icon: meta.icon,
      kicker: meta.title,
      name: play.revealed_at ? 'You two' : who,
      initial: play.revealed_at ? '&' : initialOf(who),
      tone: play.revealed_at ? 'shared' : play.mine ? 'self' : 'waiting',
      prompt: asString(asRecord(play.prompt).text) || undefined,
      body: summary.body,
      chips: summary.chips,
    })
  }

  for (const ritual of rituals) {
    items.push({
      id: `ritual-${ritual.id}`,
      at: ritual.last_completed || ritual.created_at || today,
      href: '/(app)/play/ritual',
      icon: 'repeat',
      kicker: 'Shared ritual',
      name: 'You two',
      initial: '&',
      tone: 'shared',
      body: ritual.name,
      chips: [{ label: ritual.frequency, icon: 'clock' }],
    })
  }

  items.sort((a, b) => b.at.localeCompare(a.at))

  if (!items.length) {
    return (
      <Text style={styles.empty}>
        Your thread is quiet. Check in or start something together.
      </Text>
    )
  }

  return (
    <View>
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={`${item.kicker}. ${item.name}`}
          onPress={() => {
            if (item.href) router.push(item.href as never)
          }}
          style={({ pressed }) => [styles.post, pressed && styles.pressed]}
        >
          <View
            style={[
              styles.avatar,
              item.tone === 'self' && styles.avatarSelf,
              item.tone === 'partner' && styles.avatarPartner,
              item.tone === 'shared' && styles.avatarShared,
              item.tone === 'waiting' && styles.avatarWaiting,
            ]}
          >
            {item.tone === 'waiting' ? (
              <Icon name="clock" size={16} color={colors.muted} />
            ) : (
              <Text
                style={[
                  styles.avatarLetter,
                  (item.tone === 'self' || item.tone === 'shared') &&
                    styles.avatarLetterOnAccent,
                ]}
              >
                {item.initial}
              </Text>
            )}
          </View>
          <View style={styles.copy}>
            <View style={styles.meta}>
              <Text style={styles.name}>{item.name}</Text>
              <Icon name={item.icon} size={13} color={colors.accentFill} />
              <Text style={styles.time}>{relativeTime(item.at, today)}</Text>
            </View>
            <Text style={styles.kicker}>{item.kicker}</Text>
            {item.prompt ? <Text style={styles.prompt}>{item.prompt}</Text> : null}
            {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
            {item.score ? (
              <View style={styles.score}>
                <ScoreMark score={item.score} size={22} />
              </View>
            ) : null}
            {item.chips && item.chips.length ? (
              <View style={styles.chips}>
                {item.chips.map((chip) => (
                  <View key={chip.label} style={styles.chip}>
                    {chip.icon ? (
                      <Icon name={chip.icon} size={12} color={colors.ink} />
                    ) : null}
                    <Text style={styles.chipLabel}>{chip.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  empty: {
    ...type.body,
    color: colors.muted,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  post: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  pressed: {
    backgroundColor: colors.accentSoft,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  avatarSelf: {
    backgroundColor: colors.accent,
  },
  avatarPartner: {
    backgroundColor: colors.success,
  },
  avatarShared: {
    backgroundColor: colors.accentFill,
  },
  avatarWaiting: {
    backgroundColor: colors.card,
    borderWidth: hairlineWidth,
    borderColor: colors.muted,
    borderStyle: 'dashed',
  },
  avatarLetter: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.ink,
  },
  avatarLetterOnAccent: {
    color: colors.onAccent,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    ...type.body,
    fontFamily: fonts.medium,
    fontWeight: '500',
    marginBottom: 0,
  },
  time: {
    ...type.label,
    marginBottom: 0,
  },
  kicker: {
    ...type.label,
    color: colors.accentFill,
    marginBottom: 0,
  },
  prompt: {
    ...type.label,
    color: colors.muted,
    marginBottom: 0,
  },
  body: {
    ...type.body,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 0,
  },
  score: {
    marginTop: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.card,
  },
  chipLabel: {
    ...type.label,
    color: colors.ink,
    marginBottom: 0,
  },
})
