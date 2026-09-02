import { StyleSheet, Text, View } from 'react-native'

import { ErrorText, TextLink } from './ui'
import { useNotificationPreferences } from '../hooks/useNotificationPreferences'
import { useBondPlus } from '../hooks/useBondPlus'
import { router, type Href } from 'expo-router'
import {
  formatClockLabel,
  formatHourLabel,
  shiftDailyTime,
  wrapHour,
} from '../lib/notificationSchedule'
import { colors, type } from '../lib/theme'

export function NotificationSettings() {
  const { prefs, busy, error, deviceOnly, expoGoNote, patch } =
    useNotificationPreferences()
  const plus = useBondPlus()

  return (
    <View>
      <Text style={styles.hint}>
        Off until you opt in. One optional reminder at a time you choose. Never
        after today's check-in is saved. Lock screens stay generic.
      </Text>

      <TextLink
        label={
          busy
            ? 'Saving...'
            : prefs.daily_enabled
              ? 'Daily reminder: on'
              : 'Daily reminder: off'
        }
        onPress={() => void patch({ daily_enabled: !prefs.daily_enabled })}
        disabled={busy}
      />
      <Text style={styles.meta}>Around {formatClockLabel(prefs.daily_time)}</Text>
      <View style={styles.row}>
        <TextLink
          label="Earlier"
          onPress={() =>
            void patch({ daily_time: shiftDailyTime(prefs.daily_time, -30) })
          }
          disabled={busy}
        />
        <TextLink
          label="Later"
          onPress={() =>
            void patch({ daily_time: shiftDailyTime(prefs.daily_time, 30) })
          }
          disabled={busy}
        />
      </View>

      <TextLink
        label={
          busy
            ? 'Saving...'
            : prefs.reveal_enabled
              ? 'Our reveal is ready: on'
              : 'Our reveal is ready: off'
        }
        onPress={() => void patch({ reveal_enabled: !prefs.reveal_enabled })}
        disabled={busy}
      />
      <Text style={styles.meta}>
        Only when you have both checked in. Separate from the daily reminder.
      </Text>
      {expoGoNote ? (
        <Text style={styles.meta}>
          Android Expo Go cannot receive remote alerts. Use a development or
          release build to test “Our reveal is ready.”
        </Text>
      ) : null}

      <TextLink
        label={
          prefs.quiet_hours_enabled
            ? 'Quiet hours: on'
            : 'Quiet hours: off'
        }
        onPress={() =>
          void patch({ quiet_hours_enabled: !prefs.quiet_hours_enabled })
        }
        disabled={busy}
      />
      <Text style={styles.meta}>
        {formatHourLabel(prefs.quiet_hours_start)} –{' '}
        {formatHourLabel(prefs.quiet_hours_end)}
      </Text>
      <View style={styles.row}>
        <TextLink
          label="Start earlier"
          onPress={() =>
            void patch({
              quiet_hours_start: wrapHour(prefs.quiet_hours_start, -1),
            })
          }
          disabled={busy}
        />
        <TextLink
          label="Start later"
          onPress={() =>
            void patch({
              quiet_hours_start: wrapHour(prefs.quiet_hours_start, 1),
            })
          }
          disabled={busy}
        />
      </View>
      <View style={styles.row}>
        <TextLink
          label="End earlier"
          onPress={() =>
            void patch({
              quiet_hours_end: wrapHour(prefs.quiet_hours_end, -1),
            })
          }
          disabled={busy}
        />
        <TextLink
          label="End later"
          onPress={() =>
            void patch({
              quiet_hours_end: wrapHour(prefs.quiet_hours_end, 1),
            })
          }
          disabled={busy}
        />
      </View>
      <Text style={styles.meta}>Timezone: {prefs.timezone}</Text>
      {deviceOnly ? (
        <Text style={styles.meta}>
          Reminders save on this device until the couple table is ready.
        </Text>
      ) : null}
      {plus.active ? null : (
        <TextLink
          label="Personalized reminder times are Bond Plus"
          onPress={() => router.push('/(app)/plus' as Href)}
        />
      )}
      {error ? <ErrorText message={error} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  hint: {
    ...type.body,
    color: colors.muted,
    marginBottom: 12,
  },
  meta: {
    ...type.label,
    color: colors.muted,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
})
