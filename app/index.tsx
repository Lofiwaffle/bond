import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'

import { LoadingScreen, Screen, StatusPanel } from '../components/ui'
import { useAuth } from '../lib/auth'
import { hasSeenOnboarding } from '../lib/onboarding'
import { supabaseConfigured } from '../lib/supabase'

export default function Index() {
  const { session, profile, isLoading, sessionError, retrySession } = useAuth()
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null)

  useEffect(() => {
    if (session || isLoading) return
    hasSeenOnboarding().then(setOnboardingSeen)
  }, [session, isLoading])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (sessionError && (!session || !profile)) {
    return (
      <Screen>
        <StatusPanel
          message="Couldn't restore your session. Check your connection and try again."
          onRetry={() => void retrySession()}
        />
      </Screen>
    )
  }

  if (!supabaseConfigured) {
    return <Redirect href="/connect" />
  }

  if (!session) {
    if (onboardingSeen === null) {
      return <LoadingScreen />
    }
    if (!onboardingSeen) {
      return <Redirect href="/onboarding" />
    }
    return <Redirect href="/(auth)/signup" />
  }

  if (!profile?.couple_id) {
    return <Redirect href="/(app)/setup" />
  }

  return <Redirect href="/(app)/(tabs)" />
}
