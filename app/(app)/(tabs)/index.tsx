import { Redirect, Tabs, router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LoadingScreen } from '../../../components/ui'
import { useAuth } from '../../../lib/auth'

function CheckInFab() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Check in"
      onPress={() => router.push('/(app)/check-in')}
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
    >
      <Text style={styles.fabEmoji}>😊</Text>
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
        tabBarActiveTintColor: '#F4511E',
        tabBarInactiveTintColor: '#8A8178',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Entries',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📅</Text>
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
          title: 'Stats',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>📊</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 20, color }}>⚙️</Text>
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F0E4D8',
    height: 72,
    paddingBottom: 10,
    paddingTop: 8,
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
    width: 72,
    height: 72,
    borderRadius: 999, // pill shape for iOS
    backgroundColor: '#FF8A65',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabPressed: {
    backgroundColor: '#F4511E',
  },
  fabEmoji: {
    fontSize: 26,
    marginTop: -2,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    marginTop: -2,
  },
})