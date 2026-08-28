import { useEffect, type ReactNode } from 'react'
import { View, StyleSheet } from 'react-native'

import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import { inAppSignalCopy } from '../lib/notificationCopy'
import { NotificationProvider } from './useNotificationPreferences'

type PartnerSignal = {
  id: string
  couple_id: string
  actor_id: string
  event_type: string
  summary: string
}

function PartnerSignalToasts({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    if (!user?.id || !profile?.couple_id) return

    const channel = supabase
      .channel(
        `partner_signals:${profile.couple_id}:${Math.random().toString(36).slice(2)}`,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'partner_signals',
          filter: `couple_id=eq.${profile.couple_id}`,
        },
        (payload) => {
          const row = payload.new as PartnerSignal
          if (!row?.actor_id || row.actor_id === user.id) return
          showToast(inAppSignalCopy(row.event_type))
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [profile?.couple_id, showToast, user?.id])

  return <View style={styles.wrap}>{children}</View>
}

/** Optional local reminder sync plus in-app partner toasts. No modal. */
export function PartnerActivitySync({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <PartnerSignalToasts>{children}</PartnerSignalToasts>
    </NotificationProvider>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
})
