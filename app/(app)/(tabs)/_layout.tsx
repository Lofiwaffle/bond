import { Redirect, Tabs, router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { LoadingScreen } from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { colors, radii } from '../../../lib/theme'

function CheckInFab() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Check in"
      onPress={() => router.push('/(app)/check-in')}
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
    >
      <Text style={styles.fabEmoji}>◎</Text>
      <Text style={styles.fabLabel}>Check in</Text>
    </Pressable>
  )
}

export default function TabsLayout() {
  const { profile, isLoading } = useAuth()

  if (isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/pair" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Entries',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>▦</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="check-in-tab"
        options={{
          title: '',
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
          title: 'Bond',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>◈</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 18, color }}>☰</Text>
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  fabSlot: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 68,
    height: 68,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    backgroundColor: colors.accentPressed,
  },
  fabEmoji: {
    fontSize: 20,
    color: colors.black,
    fontWeight: '800',
    marginTop: -2,
  },
  fabLabel: {
    color: colors.black,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
})
