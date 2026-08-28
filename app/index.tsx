import { useEffect, useState } from 'react'
import { Redirect, type Href } from 'expo-router'

import { LoadingScreen, Screen, StatusPanel } from '../components/ui'
import { useAuth } from '../lib/auth'
import { captureInviteFromUrl, loadPendingInvite } from '../lib/invite'
import { hasSeenOnboarding } from '../lib/onboarding'
import { supabaseConfigured } from '../lib/supabase'

export default function Index() {
  const { session, profile, isLoading, sessionError, retrySession, passwordRecovery, authLinkExpired, authLinkExpiredKind } = useAuth()
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null)
  const [pendingInvite, setPendingInvite] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    void (async () => {
      if (typeof window !== 'undefined') {
        await captureInviteFromUrl(window.location.href)
      }
      setPendingInvite(await loadPendingInvite())
    })()
  }, [])

  useEffect(() => {
    if (session || isLoading) return
    hasSeenOnboarding().then(setOnboardingSeen)
  }, [session, isLoading])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (passwordRecovery) {
    return <Redirect href={'/update-password' as Href} />
  }

  if (authLinkExpired && !session) {
    return (
      <Redirect
        href={
          (authLinkExpiredKind === 'recovery'
            ? '/update-password'
            : '/(auth)/signup') as Href
        }
      />
    )
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
    if (pendingInvite === undefined || onboardingSeen === null) {
      return <LoadingScreen />
    }
    if (pendingInvite) {
      return (
        <Redirect href={`/join?invite=${pendingInvite}` as Href} />
      )
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
