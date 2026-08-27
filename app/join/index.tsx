import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'

import {
  ErrorText,
  LoadingScreen,
  PrimaryButton,
  Screen,
  TextLink,
} from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { Icon } from '../../lib/icons'
import {
  classifyJoinError,
  clearPendingInvite,
  inviteStatusCopy,
  joinErrorCopy,
  loadPendingInvite,
  normalizeInviteCode,
  savePendingInvite,
  type InviteStatus,
} from '../../lib/invite'
import { supabase, supabaseConfigured } from '../../lib/supabase'
import { useToast } from '../../lib/toast'
import { colors, type } from '../../lib/theme'

async function peekInvite(code: string): Promise<InviteStatus> {
  if (!supabaseConfigured) return 'open'
  const { data, error } = await supabase.rpc('peek_invite', { invite: code })
  if (error || typeof data !== 'string') return 'open'
  if (data === 'full' || data === 'expired' || data === 'invalid' || data === 'open') {
    return data
  }
  return 'open'
}

export default function JoinScreen() {
  const params = useLocalSearchParams<{ invite?: string | string[] }>()
  const inviteParam = Array.isArray(params.invite) ? params.invite[0] : params.invite
  const { session, profile, partner, isLoading, joinCouple } = useAuth()
  const { showToast } = useToast()
  const [code, setCode] = useState<string | null>(normalizeInviteCode(inviteParam))
  const [status, setStatus] = useState<InviteStatus | null>(null)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const fromParam = normalizeInviteCode(inviteParam)
      if (fromParam) await savePendingInvite(fromParam)
      const stored = fromParam ?? (await loadPendingInvite())
      if (cancelled) return
      setCode(stored)
      if (!stored) {
        setReady(true)
        return
      }
      const next = await peekInvite(stored)
      if (cancelled) return
      setStatus(next)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [inviteParam])

  if (isLoading || !ready) return <LoadingScreen />

  if (session && profile?.couple_id && partner) {
    return <Redirect href="/(app)/(tabs)" />
  }

  if (session && profile?.couple_id && !partner) {
    return <Redirect href="/(app)/setup" />
  }

  if (!code) {
    return (
      <Screen>
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.title}>Missing invite</Text>
        <Text style={styles.subtitle}>
          This link does not include a Bond invite. Ask them to share it again.
        </Text>
        <PrimaryButton
          label={session ? 'Go to setup' : 'Create a Bond'}
          onPress={() =>
            router.replace(session ? '/(app)/setup' : '/(auth)/signup')
          }
        />
        {!session ? (
          <TextLink
            label="I already have an account"
            onPress={() => router.replace('/(auth)/login')}
          />
        ) : null}
      </Screen>
    )
  }

  const blocked = status === 'full' || status === 'expired' || status === 'invalid'

  const onJoin = async () => {
    if (joining || !code) return
    setError(null)
    setJoining(true)
    const result = await joinCouple(code)
    setJoining(false)
    if (result.error) {
      const kind = classifyJoinError(result.error)
      if (kind === 'full') setStatus('full')
      if (kind === 'expired') setStatus('expired')
      if (kind === 'invalid') setStatus('invalid')
      setError(joinErrorCopy(kind))
      return
    }
    await clearPendingInvite()
    showToast('You are paired')
    router.replace('/(app)/(tabs)')
  }

  const goAuth = (href: '/(auth)/signup' | '/(auth)/login') => {
    void savePendingInvite(code)
    router.push({ pathname: href, params: { invite: code } })
  }

  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <Icon name="heart" size={28} color={colors.ink} />
        <Text style={styles.kicker}>Bond invite</Text>
        <Text style={styles.title}>
          {blocked
            ? status === 'full'
              ? 'This Bond is full'
              : status === 'expired'
                ? 'This invite expired'
                : 'This invite is not valid'
            : 'You were invited'}
        </Text>
        <Text style={styles.code}>{code}</Text>
        <Text style={styles.subtitle}>
          {blocked
            ? inviteStatusCopy(status ?? 'invalid')
            : 'Create an account or sign in on this phone. We will keep this invite until you finish.'}
        </Text>
        <ErrorText message={error} />

        {!blocked && session && !profile?.couple_id ? (
          <PrimaryButton
            label="Join this Bond"
            onPress={() => void onJoin()}
            loading={joining}
          />
        ) : null}

        {!blocked && !session ? (
          <>
            <PrimaryButton
              label="Create an account to join"
              onPress={() => goAuth('/(auth)/signup')}
            />
            <TextLink
              label="I already have an account"
              onPress={() => goAuth('/(auth)/login')}
            />
          </>
        ) : null}

        {blocked ? (
          <PrimaryButton
            label={session ? 'Back to setup' : 'Create a new Bond'}
            onPress={() => {
              void clearPendingInvite()
              router.replace(session ? '/(app)/setup' : '/(auth)/signup')
            }}
          />
        ) : null}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
  },
  kicker: {
    ...type.label,
    marginTop: 12,
    marginBottom: 4,
  },
  title: {
    ...type.heading,
    marginBottom: 8,
  },
  subtitle: {
    ...type.body,
    color: colors.muted,
    marginBottom: 16,
  },
  code: {
    ...type.heading,
    letterSpacing: 6,
    textAlign: 'center',
    marginVertical: 12,
  },
})
