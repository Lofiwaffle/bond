import { useEffect, useState } from 'react'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import {
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter'

import { ErrorBoundary } from '../components/ErrorBoundary'
import { PhoneShell } from '../components/PhoneShell'
import { LoadingScreen } from '../components/ui'
import { AuthProvider } from '../lib/auth'
import { registerWebInstall } from '../lib/pwa'
import {
  initSupabase,
  subscribeSupabaseConfig,
  supabaseConfigured,
} from '../lib/supabase'
import { ToastProvider } from '../lib/toast'

registerWebInstall()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
  })
  const [ready, setReady] = useState(false)
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    void initSupabase().finally(() => {
      setConfigured(supabaseConfigured)
      setReady(true)
    })
    return subscribeSupabaseConfig(() => setConfigured(supabaseConfigured))
  }, [])

  if (!ready || (!fontsLoaded && !fontError)) return <LoadingScreen />

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider key={configured ? 'connected' : 'offline'}>
          <PhoneShell>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </PhoneShell>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

