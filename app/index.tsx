import { Redirect } from 'expo-router'

import { LoadingScreen } from '../components/ui'
import { useAuth } from '../lib/auth'

export default function Index() {
  const { session, profile, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />
  }

  if (!profile?.couple_id) {
    return <Redirect href="/(app)/pair" />
  }

  return <Redirect href="/(app)" />
}
