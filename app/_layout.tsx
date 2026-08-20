import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

import { ErrorBoundary } from '../components/ErrorBoundary'
import { AuthProvider } from '../lib/auth'
import { registerWebInstall } from '../lib/pwa'

registerWebInstall()

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </ErrorBoundary>
  )
}
