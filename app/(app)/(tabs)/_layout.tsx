import { Redirect, Tabs, router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

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
      <Text style={styles.fabPlus}>+</Text>
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
        tabBarActiveTintColor: colors.tabBarIcon,
        tabBarInactiveTintColor: colors.tabBarIconMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Entries',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: focused ? 22 : 20, color }}>☺</Text>
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
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: focused ? 20 : 18, color }}>♥</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Us',
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: focused ? 22 : 20, color }}>◎</Text>
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBar,
    borderTopWidth: 0,
    height: 78,
    paddingBottom: 14,
    paddingTop: 10,
    overflow: 'visible' as const,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  fabSlot: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.fab,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
  },
  fabPlus: {
    fontSize: 34,
    color: colors.accent,
    fontWeight: '400',
    marginTop: -2,
    lineHeight: 36,
  },
})
