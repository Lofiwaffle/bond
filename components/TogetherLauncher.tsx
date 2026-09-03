import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'

import { useAuth } from '../lib/auth'
import { Icon } from '../lib/icons'
import { FEED_LAUNCHER } from '../lib/plays'
import { scheduleTogetherActivity } from '../lib/togetherSchedule'
import { useToast } from '../lib/toast'
import { colors, fonts, radii, type } from '../lib/theme'

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
        One of you picks. That puts it on a calendar invite and nudges the other
        person. They do not have to approve.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, !inset && styles.rowFlush]}
      >
        {FEED_LAUNCHER.map((item) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.body}. Schedules a calendar invite and notifies your person.`}
            disabled={busyKey !== null}
            onPress={() => void onPick(item)}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <View style={styles.glyph}>
              <Icon name={item.icon} size={18} color={colors.accentFill} />
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {busyKey === item.title ? 'Scheduling…' : item.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  label: {
    ...type.label,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  hint: {
    ...type.body,
    color: colors.muted,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  row: {
    paddingHorizontal: 16,
    gap: 10,
  },
  rowFlush: {
    paddingHorizontal: 0,
  },
  flush: {
    paddingHorizontal: 0,
  },
  tile: {
    width: 108,
    minHeight: 108,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 12,
    gap: 10,
  },
  pressed: {
    opacity: 0.75,
  },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    color: colors.ink,
  },
})
