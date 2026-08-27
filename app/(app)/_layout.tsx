import { Redirect, Stack, type Href } from 'expo-router'

import { LoadingScreen } from '../../components/ui'
import { CheckInProvider } from '../../hooks/useCheckIn'
import { DailyActionProvider } from '../../hooks/useDailyAction'
import { HabitBadgesProvider } from '../../hooks/useHabitBadges'
import { PartnerActivitySync } from '../../hooks/usePartnerActivity'
import { useAuth } from '../../lib/auth'

export default function AppLayout() {
  const { session, isLoading, passwordRecovery } = useAuth()

  if (isLoading) return <LoadingScreen />
  if (passwordRecovery) return <Redirect href={'/update-password' as Href} />
  if (!session) return <Redirect href="/(auth)/login" />

  return (
    <CheckInProvider>
      <DailyActionProvider>
        <HabitBadgesProvider>
          <PartnerActivitySync>
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
            </Stack>
          </PartnerActivitySync>
        </HabitBadgesProvider>
      </DailyActionProvider>
    </CheckInProvider>
  )
}
