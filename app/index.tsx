import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'

import { LoadingScreen } from '../components/ui'
import { useAuth } from '../lib/auth'
import { hasSeenOnboarding } from '../lib/onboarding'

export default function Index() {
  const { session, profile, isLoading } = useAuth()
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null)

  useEffect(() => {
    if (session || isLoading) return
    hasSeenOnboarding().then(setOnboardingSeen)
  }, [session, isLoading])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!session) {
    if (onboardingSeen === null) {
      return <LoadingScreen />
    }
    if (!onboardingSeen) {
      return <Redirect href="/onboarding" />
    }
    return <Redirect href="/(auth)/login" />
  }

  if (!profile?.couple_id) {
    return <Redirect href="/(app)/pair" />
  }

  return <Redirect href="/(app)/(tabs)" />
}
