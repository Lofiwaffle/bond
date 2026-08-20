import { Redirect, Stack } from 'expo-router'

import { LoadingScreen } from '../../components/ui'
import { CheckInProvider } from '../../hooks/useCheckIn'
import { useAuth } from '../../lib/auth'

export default function AppLayout() {
  const { session, isLoading } = useAuth()

  if (isLoading) return <LoadingScreen />
  if (!session) return <Redirect href="/(auth)/login" />

  return (
    <CheckInProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bond" />
        <Stack.Screen
          name="check-in"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="weekly-review"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="day/[date]" />
        <Stack.Screen name="pair" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="history" />
      </Stack>
    </CheckInProvider>
  )
}
