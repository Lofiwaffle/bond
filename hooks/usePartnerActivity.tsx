import { useEffect, type ReactNode } from 'react'
import { Platform, View, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { useAuth } from '../lib/auth'
import {
  areNotificationsEnabled,
  enableNotifications,
  registerPushToken,
  showLocalNotification,
  syncCheckInReminder,
} from '../lib/notifications'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'
import { useTodayCheckIn } from './useCheckIn'

const ASKED_KEY = 'bond.notifications.asked'

type PartnerSignal = {
  id: string
  couple_id: string
  actor_id: string
  event_type: string
  summary: string
}

function copyForSignal(
  signal: PartnerSignal,
  partnerName: string,
): { title: string; body: string } {
  switch (signal.event_type) {
    case 'partner_checked_in':
      return {
        title: 'Bond',
        body: `${partnerName} checked in. Yours stays private until you add it.`,
      }
    case 'check_in_nudge':
      return {
        title: 'Bond',
        body: `${partnerName} saved today when you have a minute. No rush.`,
      }
    case 'partner_logged_achievement':
      return {
        title: 'New achievement',
        body: `${partnerName} ${signal.summary}.`,
      }
    case 'partner_set_goal':
      return {
        title: 'Bond',
        body: `${partnerName} set a goal.`,
      }
    case 'partner_completed_goal':
      return {
        title: 'Bond',
        body: `${partnerName} completed a goal.`,
      }
    case 'partner_weekly_review':
      return {
        title: 'Bond',
        body: `${partnerName} finished a weekly review.`,
      }
    case 'partner_joined':
      return {
        title: 'Bond',
        body: `${partnerName} joined your Bond.`,
      }
    default:
      return {
        title: 'Bond',
        body: `${partnerName} ${signal.summary}.`,
      }
  }
}

/** Requests reminder permission, keeps the daily check-in alarm in sync, and
 *  surfaces partner activity from `partner_signals` realtime. */
export function PartnerActivitySync({ children }: { children: ReactNode }) {
  const { user, partner, profile } = useAuth()
  const { mine, isLoading } = useTodayCheckIn()
  const { showToast } = useToast()

  useEffect(() => {
    if (isLoading || !user?.id) return

    void (async () => {
      const enabled = await areNotificationsEnabled()
      if (!enabled && Platform.OS !== 'web' && profile?.couple_id) {
        const asked = await AsyncStorage.getItem(ASKED_KEY)
        if (!asked) {
          await AsyncStorage.setItem(ASKED_KEY, 'true')
          await enableNotifications(user.id)
        }
      } else if (enabled && user.id) {
        await registerPushToken(user.id)
      }
      await syncCheckInReminder(Boolean(mine))
    })()
  }, [isLoading, mine, profile?.couple_id, user?.id])

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
          const name = partner?.display_name?.trim() || 'Your partner'
          const copy = copyForSignal(row, name)
          void showLocalNotification(copy.title, copy.body)
          showToast(copy.body)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [partner?.display_name, profile?.couple_id, showToast, user?.id])

  return <View style={styles.wrap}>{children}</View>
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
})
