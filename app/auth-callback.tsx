import { useEffect, useRef, useState } from 'react'
import { Redirect, type Href } from 'expo-router'
import * as Linking from 'expo-linking'

import { LoadingScreen, Screen, StatusPanel } from '../components/ui'
import { consumeAuthUrl } from '../lib/authCallback'
import { useAuth } from '../lib/auth'

export default function AuthCallbackScreen() {
  const { session, profile } = useAuth()
  const url = Linking.useLinkingURL()
  const [error, setError] = useState<string | null>(null)
  const consumed = useRef<string | null>(null)

  useEffect(() => {
    if (!url || consumed.current === url) return
    consumed.current = url
    void consumeAuthUrl(url).then((result) => {
      if (result.error) setError(result.error)
    })
  }, [url])

  if (session) {
    return (
      <Redirect
        href={
          (profile?.couple_id ? '/(app)/(tabs)' : '/(app)/setup') as Href
        }
      />
    )
  }

  if (error) {
    return (
      <Screen>
        <StatusPanel
          message={error}
          onRetry={() => {
            if (!url) return
            consumed.current = null
            setError(null)
            consumed.current = url
            void consumeAuthUrl(url).then((result) => {
              if (result.error) setError(result.error)
            })
          }}
        />
      </Screen>
    )
  }

  return <LoadingScreen label="Signing you in" />
}
