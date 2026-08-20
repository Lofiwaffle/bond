import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import { ErrorBoundary } from '../components/ErrorBoundary'
import { LoadingScreen } from '../components/ui'
import { AuthProvider } from '../lib/auth'
import { registerWebInstall } from '../lib/pwa'
import {
  initSupabase,
  subscribeSupabaseConfig,
  supabaseConfigured,
} from '../lib/supabase'

registerWebInstall()

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    void initSupabase().finally(() => {
      setConfigured(supabaseConfigured)
      setReady(true)
    })
    return subscribeSupabaseConfig(() => setConfigured(supabaseConfigured))
  }, [])

  if (!ready) return <LoadingScreen />

  return (
    <ErrorBoundary>
      <AuthProvider key={configured ? 'connected' : 'offline'}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </ErrorBoundary>
  )
}
