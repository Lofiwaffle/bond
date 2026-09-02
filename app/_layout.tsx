import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import { ErrorBoundary } from '../components/ErrorBoundary'
import { PhoneShell } from '../components/PhoneShell'
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
  const [configured, setConfigured] = useState(supabaseConfigured)

  useEffect(() => {
    void initSupabase().then(() => setConfigured(supabaseConfigured))
    return subscribeSupabaseConfig(() => setConfigured(supabaseConfigured))
  }, [])

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

