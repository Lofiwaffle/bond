import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, type Href } from 'expo-router'

import { Appear, Breathe } from './Appear'
import { PressScale } from './PressScale'
import { useCouplePlays, type PlayWithAnswers } from '../hooks/useCouplePlay'
import {
  activityRows,
  activityStatusHint,
  activityStatusLabel,
  activityTint,
  boardSummary,
  startableItems,
  type ActivityRow,
} from '../lib/activityBoard'
import { useAuth } from '../lib/auth'
import { Icon } from '../lib/icons'
import { playHref, type PlayLauncherItem } from '../lib/plays'
import { scheduleTogetherActivity } from '../lib/togetherSchedule'
import { useToast } from '../lib/toast'
import { colors, elevation, fonts, hairlineWidth, radii, type } from '../lib/theme'

function toBoardPlays(plays: PlayWithAnswers[]) {
  return plays.map((play) => ({
    id: play.id,
    kind: play.kind,
    mine: Boolean(play.mine),
    partner: Boolean(play.partner),
    revealed: Boolean(play.revealed_at),
    createdAt: play.created_at,
  }))
}

export function TogetherBoard({ inset = true }: { inset?: boolean }) {
  const { user, profile, partner } = useAuth()
  const plays = useCouplePlays()
  const { showToast } = useToast()
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const partnerName = partner?.display_name?.trim() || 'your person'
  const rows = useMemo(() => activityRows(toBoardPlays(plays.plays)), [plays.plays])
  const startable = useMemo(() => startableItems(rows), [rows])

  const onPick = async (item: PlayLauncherItem) => {
    if (!user?.id || !profile?.couple_id) {
      router.push(item.href)
      return
    }
    if (busyKey) return

    // The date planner schedules on Submit, so go straight there and nudge quietly.
    if (item.kind === 'choose_date') {
      router.push(item.href)
      void scheduleTogetherActivity({
        item,
        coupleId: profile.couple_id,
        actorId: user.id,
        partnerPushToken: partner?.expo_push_token,
      })
      return
    }

    setBusyKey(item.title)
    const result = await scheduleTogetherActivity({
      item,
      coupleId: profile.couple_id,
      actorId: user.id,
      partnerPushToken: partner?.expo_push_token,
    })
    setBusyKey(null)
    if (result.error) {
      showToast(result.error)
    } else if (result.notice) {
      showToast(result.notice)
    } else if (result.placed === 'device') {
      showToast('Added to your calendar. They’ll get a nudge — no approval needed.')
    } else {
      showToast('Calendar opened. They’ll get a nudge — no approval needed.')
    }
    router.push(item.href)
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, !inset && styles.flush]}>
        <Text style={styles.label}>Together</Text>
        <Text style={styles.summary}>{boardSummary(rows)}</Text>
      </View>

      {rows.length > 0 ? (
        <View style={[styles.rows, !inset && styles.flush]}>
          {rows.map((row, index) => (
            <Appear key={row.id} delay={index * 60}>
              <ActivityCard row={row} partnerName={partnerName} />
            </Appear>
          ))}
        </View>
      ) : null}

      {startable.length > 0 ? (
        <>
          <Text style={[styles.kicker, !inset && styles.flush]}>
            {rows.length > 0 ? 'Start something else' : 'Start something'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.tileRow, !inset && styles.tileRowFlush]}
          >
            {startable.map((item, index) => {
              const tint = activityTint(item.kind as string)
              return (
                <Appear key={item.title} delay={index * 50}>
                  <PressScale
                    accessibilityLabel={
                      item.kind === 'choose_date'
                        ? `${item.title}. ${item.body}`
                        : `${item.title}. ${item.body}. Schedules a calendar invite and notifies your person.`
                    }
                    disabled={busyKey !== null}
                    scaleTo={0.94}
                    onPress={() => void onPick(item)}
                    style={[styles.tile, { backgroundColor: tint.bg }]}
                  >
                    <View style={[styles.glyph, { backgroundColor: tint.glyphBg }]}>
                      <Icon name={item.icon} size={20} color={tint.ink} />
                    </View>
                    <Text style={styles.tileTitle} numberOfLines={2}>
                      {busyKey === item.title ? 'Scheduling…' : item.title}
                    </Text>
                    <Text style={styles.tileBody} numberOfLines={2}>
                      {item.body}
                    </Text>
                  </PressScale>
                </Appear>
              )
            })}
          </ScrollView>
        </>
      ) : null}

      <Text style={[styles.hint, !inset && styles.flush]}>
        One of you picks. That nudges the other person — no approval needed. Answers
        stay private until you both finish a round.
      </Text>
    </View>
  )
}

function ActivityCard({
  row,
  partnerName,
}: {
  row: ActivityRow
  partnerName: string
}) {
  const tint = activityTint(row.kind)
  const ready = row.status === 'ready'
  return (
    <PressScale
      accessibilityLabel={`${row.title}. ${activityStatusLabel(row.status, partnerName)}. ${activityStatusHint(row.status, partnerName)}`}
      onPress={() => router.push(playHref(row.kind) as Href)}
      style={[styles.card, { backgroundColor: tint.bg }]}
    >
      <Breathe active={ready} style={[styles.glyph, { backgroundColor: tint.glyphBg }]}>
        <Icon name={row.icon} size={18} color={tint.ink} />
      </Breathe>
      <View style={styles.cardCopy}>
        <Text style={[styles.status, { color: tint.ink }]}>
          {activityStatusLabel(row.status, partnerName)}
        </Text>
        <Text style={styles.cardTitle}>{row.title}</Text>
        <Text style={styles.cardHint}>{activityStatusHint(row.status, partnerName)}</Text>
      </View>
      {ready ? (
        <View style={[styles.dot, { backgroundColor: tint.ink }]} />
      ) : (
        <Icon name="chevron-right" size={16} color={colors.muted} />
      )}
    </PressScale>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
    paddingVertical: 4,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  label: {
    ...type.label,
    color: colors.accentFill,
    marginBottom: 2,
  },
  summary: {
    ...type.heading,
    marginBottom: 0,
  },
  kicker: {
    ...type.label,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  hint: {
    ...type.label,
    color: colors.muted,
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 0,
  },
  flush: {
    paddingHorizontal: 0,
  },
  rows: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    ...elevation.card,
  },
  cardCopy: {
    flex: 1,
  },
  status: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardTitle: {
    ...type.body,
    fontFamily: fonts.medium,
    fontWeight: '500',
    marginBottom: 0,
  },
  cardHint: {
    ...type.label,
    marginTop: 2,
    marginBottom: 0,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tileRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
  },
  tileRowFlush: {
    paddingHorizontal: 0,
  },
  tile: {
    width: 148,
    minHeight: 148,
    borderRadius: radii.lg,
    padding: 14,
    gap: 8,
    borderWidth: hairlineWidth,
    borderColor: colors.border,
    ...elevation.card,
  },
  glyph: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.ink,
  },
  tileBody: {
    ...type.label,
    marginBottom: 0,
  },
})
