import { Redirect, Stack } from 'expo-router'

import { LoadingScreen } from '../../components/ui'
import { useAuth } from '../../lib/auth'

export default function AppLayout() {
  const { session, isLoading } = useAuth()

  if (isLoading) return <LoadingScreen />
  if (!session) return <Redirect href="/(auth)/login" />

  return <Stack screenOptions={{ headerShown: false }} />
}
