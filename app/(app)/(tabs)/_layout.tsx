import { Feather } from '@expo/vector-icons'
import { Redirect, Tabs, router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { LoadingScreen } from '../../../components/ui'
import { useTodayCheckIn } from '../../../hooks/useCheckIn'
import { useAuth } from '../../../lib/auth'
import { todayPhase } from '../../../lib/nextStep'
import { colors, elevation, radii } from '../../../lib/theme'

function CheckInFab() {
  const { mine, waitingForPartner, bothSubmitted } = useTodayCheckIn()
  const phase = todayPhase({
    hasMine: Boolean(mine),
    waitingForPartner,
    bothSubmitted,
  })
  const label =
    phase === 'compose' ? 'Check-in' : phase === 'waiting' ? 'Saved' : 'Reveal'
  const icon = phase === 'compose' ? 'plus' : phase === 'waiting' ? 'check' : 'book-open'
  const accessibilityLabel =
    phase === 'compose'
      ? 'Check in'
      : phase === 'waiting'
        ? 'Open saved check-in'
        : "Open today's reveal"

  const onPress = () => {
    if (phase === 'compose') {
      router.push('/(app)/check-in')
      return
    }
    router.navigate('/(app)/(tabs)')
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={(state) => [
        styles.fabWrap,
        state.pressed && styles.fabPressed,
        Boolean((state as { focused?: boolean }).focused) && styles.fabFocus,
      ]}
    >
      <View style={styles.fab}>
        <Feather name={icon} size={26} color={colors.onAccent} />
      </View>
      <Text style={styles.fabLabel}>{label}</Text>
    </Pressable>
  )
}

export default function TabsLayout() {
  const { profile, isLoading } = useAuth()

  if (isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tabBarIconMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <Feather name="sun" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Feather name="clock" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="check-in-tab"
        options={{
          title: 'Check-in',
          tabBarLabel: () => null,
          tabBarButton: () => (
            <View style={styles.fabSlot}>
              <CheckInFab />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Growth',
          tabBarIcon: ({ color, size }) => (
            <Feather name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Us',
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBar,
    borderTopWidth: 0.5,
    borderTopColor: colors.hairline,
    height: 78,
    paddingBottom: 14,
    paddingTop: 10,
    overflow: 'visible' as const,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  fabSlot: {
    top: -18,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  fabWrap: {
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.fab,
  },
  fabLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '400',
    color: colors.tabBarIconMuted,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
  },
  fabFocus: {
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.ink,
  },
})
