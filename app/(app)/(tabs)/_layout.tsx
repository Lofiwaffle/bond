import { Feather } from '@expo/vector-icons'
import { Redirect, Tabs, router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'

import { LoadingScreen } from '../../../components/ui'
import { useAuth } from '../../../lib/auth'
import { colors, elevation, radii } from '../../../lib/theme'

function CheckInFab() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Check in"
      onPress={() => router.push('/(app)/check-in')}
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
    >
      <Feather name="plus" size={26} color={colors.onAccent} />
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
        tabBarInactiveTintColor: colors.tabBarIconMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Entries',
          tabBarIcon: ({ color, size }) => (
            <Feather name="align-left" size={size} color={color} />
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
          tabBarIcon: ({ color, size }) => (
            <Feather name="heart" size={size} color={color} />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.fab,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
  },
})
