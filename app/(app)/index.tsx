import { Redirect } from 'expo-router'

import { LoadingScreen } from '../../components/ui'
import { useAuth } from '../../lib/auth'

/** Legacy /(app) index: send paired users to tabs, unpaired to setup. */
export default function AppIndex() {
  const { profile, isLoading } = useAuth()
  if (isLoading) return <LoadingScreen />
  if (!profile?.couple_id) return <Redirect href="/(app)/setup" />
  return <Redirect href="/(app)/(tabs)" />
}
