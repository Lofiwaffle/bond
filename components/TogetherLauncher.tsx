import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { PressScale } from './PressScale'
import { useAuth } from '../lib/auth'
import { Icon } from '../lib/icons'
import { FEED_LAUNCHER } from '../lib/plays'
import { scheduleTogetherActivity } from '../lib/togetherSchedule'
import { useToast } from '../lib/toast'
import { colors, elevation, fonts, hairlineWidth, radii, type } from '../lib/theme'

export function TogetherLauncher({ inset = true }: { inset?: boolean }) {
  const { user, profile, partner } = useAuth()
  const { showToast } = useToast()
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const onPick = async (item: (typeof FEED_LAUNCHER)[number]) => {
    if (!user?.id || !profile?.couple_id) {
      router.push(item.href)
      return
    }
    if (busyKey) return
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
    } else {
      showToast('Calendar opened. They’ll get a nudge — no approval needed.')
    }
    router.push(item.href)
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, !inset && styles.flush]}>Together</Text>
      <Text style={[styles.hint, !inset && styles.flush]}>
        One of you picks. That nudges the other person — no approval needed.
        Most tiles also open a calendar invite. Choose our date opens the
        planner; Submit puts that day on the calendar.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, !inset && styles.rowFlush]}
      >
        {FEED_LAUNCHER.map((item) => (
          <PressScale
            key={item.title}
            accessibilityLabel={
              item.kind === 'choose_date'
                ? `${item.title}. ${item.body}`
                : `${item.title}. ${item.body}. Schedules a calendar invite and notifies your person.`
            }
            disabled={busyKey !== null}
            scaleTo={0.94}
            onPress={() => void onPick(item)}
            style={styles.tile}
          >
            <View style={styles.glyph}>
              <Icon name={item.icon} size={20} color={colors.accentFill} />
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {busyKey === item.title ? 'Scheduling…' : item.title}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {item.body}
            </Text>
          </PressScale>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
    paddingVertical: 4,
  },
  label: {
    ...type.label,
    color: colors.accentFill,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  hint: {
    ...type.body,
    color: colors.muted,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
  },
  rowFlush: {
    paddingHorizontal: 0,
  },
  flush: {
    paddingHorizontal: 0,
  },
  tile: {
    width: 148,
    minHeight: 148,
    backgroundColor: colors.card,
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
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.ink,
  },
  body: {
    ...type.label,
    marginBottom: 0,
  },
})
