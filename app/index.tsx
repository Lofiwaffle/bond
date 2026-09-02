import { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { Redirect, type Href } from 'expo-router'

import { LoadingScreen, Screen, StatusPanel } from '../components/ui'
import { useAuth } from '../lib/auth'
import { captureInviteFromUrl, loadPendingInvite } from '../lib/invite'
import {
  hasSeenOnboarding,
  rememberedOnboardingSeen,
} from '../lib/onboarding'
import {
  SESSION_RESTORE_ERROR,
  captureInviteFromWindowLocation,
} from '../lib/startup'
import { supabaseConfigured } from '../lib/supabase'

export default function Index() {
  const { session, profile, isLoading, sessionError, retrySession, passwordRecovery, authLinkExpired, authLinkExpiredKind } = useAuth()
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(
    rememberedOnboardingSeen(),
  )
  const [pendingInvite, setPendingInvite] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        if (captureInviteFromWindowLocation(Platform.OS)) {
          await captureInviteFromUrl(window.location.href)
        }
        const [invite, seen] = await Promise.all([
          loadPendingInvite(),
          hasSeenOnboarding(),
        ])
        if (cancelled) return
        setPendingInvite(invite)
        setOnboardingSeen(seen)
      } catch {
        if (cancelled) return
        setPendingInvite(null)
        setOnboardingSeen(rememberedOnboardingSeen() ?? false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      setOnboardingSeen((current) => (current === null ? false : current))
    }, 2000)
    return () => clearTimeout(id)
  }, [])

  if (isLoading || onboardingSeen === null) {
    return <LoadingScreen label="Opening Bond" />
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
          message={SESSION_RESTORE_ERROR}
          onRetry={() => void retrySession()}
        />
      </Screen>
    )
  }

  if (!supabaseConfigured) {
    return <Redirect href="/connect" />
  }

  if (!session) {
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
